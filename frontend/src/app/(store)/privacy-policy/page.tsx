import type { Metadata } from "next";
import { ContentPage, Prose, Tbc } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy-policy" } };

export default function PrivacyPolicyPage() {
  return (
    <ContentPage eyebrow="Policies" title="Privacy Policy" draft>
      <Prose>
        <p>
          This policy explains what personal data Events Emporio collects, why, and how it is protected. Data controller and grievance
          officer: <Tbc>legal entity name, contact details</Tbc>.
        </p>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Order details:</strong> name, email, mobile number and delivery address — to fulfil and support your orders.
          </li>
          <li>
            <strong>Account details:</strong> if you create an account, your login email and a securely hashed password.
          </li>
          <li>
            <strong>Enquiries:</strong> information you send through contact and custom-order forms.
          </li>
          <li>
            <strong>Newsletter:</strong> your email, only with your explicit consent.
          </li>
        </ul>
        <h2>Payments</h2>
        <p>
          Payments are processed by Razorpay. We never see or store your full card details; we keep only the payment reference needed to
          reconcile your order.
        </p>
        <h2>Cookies & browser storage</h2>
        <p>
          We use essential storage to keep your bag, wishlist and sign-in session working. Analytics: <Tbc>analytics provider, if any</Tbc>.
        </p>
        <h2>Sharing</h2>
        <p>We share data only with service providers needed to run the store (payments, delivery, email) and never sell it.</p>
        <h2>Retention & your rights</h2>
        <p>
          You can ask to access, correct or delete your data, and withdraw marketing consent at any time. Retention periods:{" "}
          <Tbc>retention schedule</Tbc>.
        </p>
      </Prose>
    </ContentPage>
  );
}
