import { z } from "zod";

/**
 * Shared Zod schemas. The same schemas validate forms in the browser and
 * will validate request bodies in Server Actions / Route Handlers.
 */

const name = z.string().trim().min(2, "Please enter your full name").max(80, "That name is too long");
const email = z.string().trim().toLowerCase().email("Please enter a valid email address").max(120);
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+91)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"));
const pincode = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code");

export const newsletterSchema = z.object({
  email,
  consent: z.literal(true, { error: "Please confirm you'd like to receive emails" }),
});

export const addressSchema = z.object({
  fullName: name,
  phone,
  line1: z.string().trim().min(3, "Please enter your address").max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Please enter your city").max(60),
  state: z.string().trim().min(2, "Please choose your state"),
  pincode,
  country: z.literal("India"),
});

export const checkoutSchema = z.object({
  email,
  phone,
  shipping: addressSchema.omit({ phone: true }),
  deliveryInstructions: z.string().trim().max(300, "Please keep instructions under 300 characters").optional().or(z.literal("")),
  shippingMethod: z.enum(["standard", "express"]),
  saveAddress: z.boolean().optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password"),
});

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const registerSchema = z
  .object({
    name,
    email,
    password,
    confirmPassword: z.string(),
    marketing: z.boolean().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

export const profileSchema = z.object({ name, email, phone: phone.optional().or(z.literal("")) });

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password"), password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

export const contactSchema = z.object({
  name,
  email,
  phone: phone.optional().or(z.literal("")),
  subject: z.enum(["order", "product", "custom", "other"]),
  message: z.string().trim().min(10, "Please tell us a little more").max(2000),
});

export const customOrderSchema = z.object({
  name,
  email,
  phone,
  occasion: z.enum(["wedding", "mehndi", "engagement", "corporate", "festive", "other"], { error: "Please choose an occasion" }),
  eventDate: z.string().optional().or(z.literal("")),
  quantity: z.coerce.number<string | number>().int("Whole numbers only").min(1, "At least 1").max(10000),
  budget: z.enum(["under-1k", "1k-2.5k", "2.5k-5k", "5k-10k", "above-10k", "unsure"]),
  details: z.string().trim().min(20, "Please describe what you have in mind (20+ characters)").max(3000),
});

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(4, "Enter your order number").max(30),
  email,
});

/* ------------------------------- Admin forms ------------------------------ */
const slug = z
  .string()
  .trim()
  .min(2, "Slug is required")
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only");
const rupees = z.coerce.number<string | number>().min(0, "Can't be negative").max(10_000_000);

export const productFormSchema = z
  .object({
    name: z.string().trim().min(2, "Product name is required").max(120),
    slug,
    sku: z
      .string()
      .trim()
      .min(2, "SKU is required")
      .max(40)
      .regex(/^[A-Z0-9-]+$/i, "Letters, numbers and hyphens only"),
    shortDescription: z.string().trim().min(10, "Add a short description").max(200),
    description: z.string().trim().min(10, "Add a description").max(4000),
    categorySlug: z.string().min(1, "Choose a category"),
    collectionSlugs: z.array(z.string()),
    status: z.enum(["active", "draft", "archived"]),
    isFeatured: z.boolean(),
    isNewArrival: z.boolean(),
    colour: z.string().trim().max(30).optional().or(z.literal("")),
    careInfo: z.string().trim().max(600).optional().or(z.literal("")),
    giftMessage: z.boolean(),
    customPackaging: z.boolean(),
    quoteOnRequest: z.boolean(),
    seoTitle: z.string().trim().max(70, "Keep SEO titles under 70 characters").optional().or(z.literal("")),
    seoDescription: z.string().trim().max(160, "Keep meta descriptions under 160 characters").optional().or(z.literal("")),
    images: z
      .array(
        z.object({
          src: z.string().min(1),
          alt: z.string().trim().min(3, "Alt text is required for accessibility").max(160),
          width: z.number(),
          height: z.number(),
        }),
      )
      .min(1, "Add at least one image"),
    options: z
      .array(z.object({ name: z.string().trim().min(1, "Name the option"), values: z.string().trim().min(1, "Add values") }))
      .max(2),
    variants: z
      .array(
        z.object({
          id: z.string(),
          sku: z.string().trim().min(2, "SKU required").max(50),
          label: z.string(),
          options: z.record(z.string(), z.string()),
          price: rupees.refine((v) => v > 0, "Price must be above zero"),
          compareAtPrice: rupees.optional().or(z.literal("")),
          stock: z.coerce.number<string | number>().int("Whole units only").min(0, "Can't be negative").max(100000),
        }),
      )
      .min(1, "At least one variant is required"),
    attributes: z.array(
      z.object({ key: z.string().trim().min(1, "Label required").max(40), value: z.string().trim().min(1, "Value required").max(200) }),
    ),
  })
  .superRefine((d, ctx) => {
    d.variants.forEach((v, i) => {
      if (
        v.compareAtPrice !== "" &&
        v.compareAtPrice !== undefined &&
        Number(v.compareAtPrice) > 0 &&
        Number(v.compareAtPrice) <= Number(v.price)
      ) {
        ctx.addIssue({ code: "custom", path: ["variants", i, "compareAtPrice"], message: "Must be higher than the price" });
      }
    });
    const skus = d.variants.map((v) => v.sku.toUpperCase());
    skus.forEach((s, i) => {
      if (skus.indexOf(s) !== i) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "Duplicate SKU" });
    });
  });

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(60),
  slug,
  description: z.string().trim().max(400),
  parentId: z.string().optional().or(z.literal("")),
  displayOrder: z.coerce.number<string | number>().int().min(0).max(999),
  isActive: z.boolean(),
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(160).optional().or(z.literal("")),
});

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "At least 3 characters")
      .max(20)
      .regex(/^[A-Z0-9]+$/, "Letters and numbers only"),
    type: z.enum(["percentage", "fixed"]),
    value: z.coerce.number<string | number>().positive("Must be above zero"),
    minSubtotal: rupees,
    maxDiscount: rupees.optional().or(z.literal("")),
    usageLimit: z.coerce.number<string | number>().int().min(1).optional().or(z.literal("")),
    perCustomerLimit: z.coerce.number<string | number>().int().min(1).optional().or(z.literal("")),
    startsAt: z.string().min(1, "Start date required"),
    expiresAt: z.string().min(1, "End date required"),
    categorySlugs: z.array(z.string()),
    isActive: z.boolean(),
  })
  .refine((d) => d.type !== "percentage" || d.value <= 90, { path: ["value"], message: "Percentage discounts are capped at 90%" })
  .refine((d) => new Date(d.expiresAt) > new Date(d.startsAt), { path: ["expiresAt"], message: "End date must be after the start date" });

export const indianStates = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;
