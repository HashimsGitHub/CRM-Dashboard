"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ZodType } from "zod";
import * as svc from "@/lib/admin-service";
import { FieldValidationError } from "@/lib/admin-service";
import { createSession, destroySession, requireAdmin, verifyCredentials } from "@/lib/auth";
import { clearBucket, clientIp, hit } from "@/lib/rate-limit";
import * as v from "@/lib/validation";

export interface FormState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Changes on each success so client forms can reset. */
  nonce?: number;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

function parse<T>(schema: ZodType<T>, fd: FormData): { data: T } | { state: FormState } {
  const r = schema.safeParse(Object.fromEntries(fd));
  if (r.success) return { data: r.data };
  const fieldErrors: Record<string, string> = {};
  for (const i of r.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
  return { state: { error: Object.values(fieldErrors)[0], fieldErrors } };
}

/** Wraps a mutation: auth → validate → run → revalidate, with safe error output. */
async function mutate<T>(schema: ZodType<T>, fd: FormData, paths: string[], run: (data: T, adminId: string) => Promise<void>): Promise<FormState> {
  const admin = await requireAdmin();
  const p = parse(schema, fd);
  if ("state" in p) return p.state;
  try {
    await run(p.data, admin.id);
  } catch (e) {
    if (e instanceof FieldValidationError) return { error: e.message };
    console.error("admin action failed", e instanceof Error ? e.name : "unknown");
    return { error: GENERIC_ERROR };
  }
  for (const path of paths) revalidatePath(path);
  return { ok: true, nonce: Date.now() };
}

const orderPaths = (id: string) => [`/admin/orders/${id}`, `/admin/orders/${id}/edit`, "/admin"];

/* ───────── Auth ───────── */

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = v.loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Enter your username and password." };
  const key = `login:${clientIp(await headers())}`;
  if (!hit(key, 8, 15 * 60_000).allowed) return { error: "Too many sign-in attempts. Try again in a few minutes." };
  const admin = await verifyCredentials(parsed.data.username, parsed.data.password);
  if (!admin) return { error: "Invalid username or password." };
  clearBucket(key);
  await createSession(admin.id);
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

/* ───────── Orders ───────── */

function customValuesFrom(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, val] of fd.entries()) if (k.startsWith("cf_") && typeof val === "string") out[k.slice(3)] = val;
  return out;
}

export async function saveOrderAction(orderId: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const p = parse(v.orderSchema, fd);
  if ("state" in p) return p.state;
  let id = orderId;
  try {
    if (orderId) await svc.updateOrder(orderId, p.data, customValuesFrom(fd));
    else id = (await svc.createOrder(p.data, customValuesFrom(fd))).id;
  } catch (e) {
    if (e instanceof FieldValidationError) return { error: e.message };
    console.error("save order failed", e instanceof Error ? e.name : "unknown");
    return { error: GENERIC_ERROR };
  }
  revalidatePath("/admin");
  if (!orderId) redirect(`/admin/orders/${id}/edit?created=1`);
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true, nonce: Date.now() };
}

export async function archiveOrderAction(orderId: string, archive: boolean) {
  await requireAdmin();
  await svc.setOrderActive(orderId, !archive);
  revalidatePath("/admin");
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(archive ? "/admin" : `/admin/orders/${orderId}`);
}

/* ───────── Order children ───────── */

export const addItemAction = async (orderId: string, _p: FormState, fd: FormData) =>
  mutate(v.itemSchema, fd, orderPaths(orderId), (d) => svc.addItem(orderId, d));

export async function deleteItemAction(orderId: string, id: string) {
  await requireAdmin();
  await svc.deleteItem(orderId, id);
  orderPaths(orderId).forEach((p) => revalidatePath(p));
}

export const saveProjectAction = async (orderId: string, _p: FormState, fd: FormData) =>
  mutate(v.projectSchema, fd, orderPaths(orderId), (d) => svc.saveProject(orderId, d));

export async function deleteProjectAction(orderId: string) {
  await requireAdmin();
  await svc.deleteProject(orderId);
  orderPaths(orderId).forEach((p) => revalidatePath(p));
}

export const addMilestoneAction = async (orderId: string, _p: FormState, fd: FormData) =>
  mutate(v.milestoneSchema, fd, orderPaths(orderId), (d) => svc.addMilestone(orderId, d));

export const updateMilestoneAction = async (orderId: string, id: string, _p: FormState, fd: FormData) =>
  mutate(v.milestoneSchema, fd, orderPaths(orderId), (d) => svc.updateMilestone(orderId, id, d));

export async function deleteMilestoneAction(orderId: string, id: string) {
  await requireAdmin();
  await svc.deleteMilestone(orderId, id);
  orderPaths(orderId).forEach((p) => revalidatePath(p));
}

export async function moveMilestoneAction(orderId: string, id: string, dir: "up" | "down") {
  await requireAdmin();
  await svc.moveMilestone(orderId, id, dir);
  orderPaths(orderId).forEach((p) => revalidatePath(p));
}

export async function progressFromMilestonesAction(orderId: string) {
  await requireAdmin();
  await svc.progressFromMilestones(orderId);
  orderPaths(orderId).forEach((p) => revalidatePath(p));
}

export const addShipmentAction = async (orderId: string, _p: FormState, fd: FormData) =>
  mutate(v.shipmentSchema, fd, orderPaths(orderId), (d) => svc.addShipment(orderId, d));

export const updateShipmentAction = async (orderId: string, id: string, _p: FormState, fd: FormData) =>
  mutate(v.shipmentSchema, fd, orderPaths(orderId), (d) => svc.updateShipment(orderId, id, d));

export async function deleteShipmentAction(orderId: string, id: string) {
  await requireAdmin();
  await svc.deleteShipment(orderId, id);
  orderPaths(orderId).forEach((p) => revalidatePath(p));
}

export const addUpdateAction = async (orderId: string, _p: FormState, fd: FormData) =>
  mutate(v.statusUpdateSchema, fd, orderPaths(orderId), (d, adminId) => svc.addStatusUpdate(orderId, d, adminId));

export async function deleteUpdateAction(orderId: string, id: string) {
  await requireAdmin();
  await svc.deleteStatusUpdate(orderId, id);
  orderPaths(orderId).forEach((p) => revalidatePath(p));
}

export const addTimelineAction = async (orderId: string, _p: FormState, fd: FormData) =>
  mutate(v.timelineEventSchema, fd, orderPaths(orderId), (d) => svc.addTimelineEntry(orderId, d));

export async function deleteTimelineAction(orderId: string, id: string) {
  await requireAdmin();
  await svc.deleteTimelineEvent(orderId, id);
  orderPaths(orderId).forEach((p) => revalidatePath(p));
}

/* ───────── Custom fields & settings ───────── */

export const createFieldAction = async (_p: FormState, fd: FormData) =>
  mutate(v.fieldDefinitionSchema, fd, ["/admin/fields"], async (d) => void (await svc.createFieldDefinition(d)));

export const updateFieldAction = async (id: string, _p: FormState, fd: FormData) =>
  mutate(v.fieldDefinitionSchema, fd, ["/admin/fields"], (d) => svc.updateFieldDefinition(id, d));

export const saveSettingsAction = async (_p: FormState, fd: FormData) =>
  mutate(v.settingsSchema, fd, ["/admin/settings", "/"], (d) => svc.saveSettings(d));
