import { z } from 'zod';
import {
  bookingStatusSchema, createClassSchema, createCoachSchema, createLeadSchema, createPlanSchema, createSessionSchema,
  createStaffSchema, freezeSchema, gymUpdateSchema, memberFieldsSchema, otpRequestSchema, otpVerifySchema, payDebtSchema,
  publicLeadSchema, refundSchema, refreshSchema, renewSchema, updateClassSchema, updateCoachSchema, updateLeadSchema,
  updateMemberSchema, updatePlanSchema,
} from '@fulad/shared';
// طرح‌های کوچک محلّی
const checkinSchema = z.object({ token: z.string().min(8).max(64) });
const bookMemberSchema = z.object({ memberId: z.string().uuid() });
const bookingUpdateSchema = z.object({ status: bookingStatusSchema });
import { buildOpenApi } from './openapi';
import type { BodySchemas, JsonSchema } from './openapi';

// io: 'input' یعنی شکل ورودی (قبل از transform)؛ بقیه‌ی ساختار از خود Zod می‌آید
const toSchema = (s: z.ZodType): JsonSchema => {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(s, { io: 'input', unrepresentable: 'any' }) as JsonSchema;
  return rest;
};

export function buildOpenApiDocument() {
  const bodies: BodySchemas = {
    otpRequest: toSchema(otpRequestSchema),
    otpVerify: toSchema(otpVerifySchema),
    refresh: toSchema(refreshSchema),
    memberFields: toSchema(memberFieldsSchema),
    updateMember: toSchema(updateMemberSchema),
    createPlan: toSchema(createPlanSchema),
    updatePlan: toSchema(updatePlanSchema),
    renew: toSchema(renewSchema),
    payDebt: toSchema(payDebtSchema),
    gymUpdate: toSchema(gymUpdateSchema),
    createStaff: toSchema(createStaffSchema),
    freeze: toSchema(freezeSchema),
    refund: toSchema(refundSchema),
    createLead: toSchema(createLeadSchema),
    updateLead: toSchema(updateLeadSchema),
    checkin: toSchema(checkinSchema),
    createCoach: toSchema(createCoachSchema),
    updateCoach: toSchema(updateCoachSchema),
    createClass: toSchema(createClassSchema),
    updateClass: toSchema(updateClassSchema),
    createSession: toSchema(createSessionSchema),
    bookMember: toSchema(bookMemberSchema),
    bookingUpdate: toSchema(bookingUpdateSchema),
    publicLead: toSchema(publicLeadSchema),
  };
  return buildOpenApi(bodies);
}

/** در production پیش‌فرض خاموش است؛ با ENABLE_DOCS=true روشن می‌شود */
export const docsEnabled = (): boolean =>
  process.env.ENABLE_DOCS ? process.env.ENABLE_DOCS === 'true' : process.env.NODE_ENV !== 'production';
