import type { Metadata } from "next";
import { ContentPage, Prose, Tbc } from "@/components/layout/content-page";
import { storeSettings } from "@/lib/data/settings";
import { loadSettings } from "@/lib/db/queries";
import { SHIPPING_METHODS, shippingPrice } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Shipping Policy", alternates: { canonical: "/shipping-policy" } };

export default async function ShippingPolicyPage() {
  const settings = await loadSettings();
  const { shipping } = settings;
  return (
    <ContentPage eyebrow="Policies" title="Shipping Policy" draft>
      <Prose>
        <h2>Where we deliver</h2>
        <p>
          We ship from {storeSettings.location.city}, {storeSettings.location.region}. Serviceable regions: <Tbc>delivery coverage</Tbc>.
        </p>
        <h2>Delivery charges</h2>
        <ul>
          {SHIPPING_METHODS.map((m) => (
            <li key={m.id}>
              <strong>{m.label}:</strong> {formatPrice(shippingPrice(settings, m.id))}
            </li>
          ))}
          {shipping.freeShippingThreshold !== null && <li>Free delivery on orders over {formatPrice(shipping.freeShippingThreshold)}.</li>}
        </ul>
        <p>The exact charge for your order is shown at checkout before you pay.</p>
        <h2>Dispatch & delivery times</h2>
        <p>
          Ready-to-ship items are dispatched within <Tbc>dispatch window</Tbc>. Delivery typically takes <Tbc>transit times by region</Tbc>.
          Custom and personalised orders follow the timeline agreed in your quote.
        </p>
        <h2>Tracking</h2>
        <p>Once your order ships, we&apos;ll share the courier and tracking number. You can also check status on the Track Order page.</p>
        <h2>Delays & damaged parcels</h2>
        <p>
          If your parcel arrives damaged, please contact us within <Tbc>reporting window</Tbc> of delivery with photographs so we can help.
        </p>
      </Prose>
    </ContentPage>
  );
}
