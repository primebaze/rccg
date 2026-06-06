import { z } from "zod";

export const memberSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(80),
  lastName: z.string().trim().min(2, "Last name is required").max(80),
  email: z.string().trim().email("Enter a valid email address").max(160),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(32),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth"),
  maritalStatus: z.enum(["single", "married", "widowed", "divorced", "prefer_not_to_say"]),
  isOrdained: z.boolean().default(false),
  addressLine1: z.string().trim().min(3, "Address is required").max(180),
  addressLine2: z.string().trim().max(180).optional().default(""),
  city: z.string().trim().min(2, "City is required").max(100),
  postalCode: z.string().trim().min(2, "Postal code is required").max(24),
  country: z.string().trim().min(2, "Country is required").max(80),
  occupation: z.string().trim().max(120).optional().default(""),
  ministryDepartment: z.string().trim().max(120).optional().default(""),
  emergencyContactName: z.string().trim().max(120).optional().default(""),
  emergencyContactPhone: z.string().trim().max(32).optional().default(""),
  consentEmail: z.literal(true, {
    errorMap: () => ({ message: "Email consent is required" })
  }),
  consentSms: z.boolean().default(true)
});

export type MemberFormInput = z.infer<typeof memberSchema>;

export type Member = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  marital_status: "single" | "married" | "widowed" | "divorced" | "prefer_not_to_say";
  is_ordained: boolean;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postal_code: string;
  country: string;
  occupation: string | null;
  ministry_department: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  consent_email: boolean;
  consent_sms: boolean;
  created_at: string;
};
