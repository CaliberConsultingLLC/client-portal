import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="mb-8 text-3xl font-extrabold text-text-primary">
          Privacy Policy
        </h1>
        <div className="flex flex-col gap-6 text-sm leading-relaxed text-text-secondary">
          <p>
            <strong className="text-text-primary">Last updated:</strong> March
            2026
          </p>
          <p>
            North Star Partners (&quot;we,&quot; &quot;our,&quot; or
            &quot;us&quot;) is committed to protecting the privacy and
            confidentiality of all data we collect through our consulting
            services and this website.
          </p>

          <h2 className="mt-4 text-lg font-bold text-text-primary">
            Information We Collect
          </h2>
          <p>
            We collect information you provide directly to us, including contact
            information when you reach out through our website, and survey
            response data collected through our client engagement platforms. All
            survey responses are collected anonymously or under strict
            confidentiality protocols.
          </p>

          <h2 className="mt-4 text-lg font-bold text-text-primary">
            How We Use Your Information
          </h2>
          <p>
            Contact information is used solely to respond to your inquiries and
            provide our consulting services. Survey data is used exclusively for
            analysis and reporting as part of our client engagements. We never
            sell, share, or otherwise distribute personal or survey data to third
            parties outside the scope of our consulting agreements.
          </p>

          <h2 className="mt-4 text-lg font-bold text-text-primary">
            Data Security
          </h2>
          <p>
            We use industry-standard security measures to protect all data,
            including encryption in transit and at rest, role-based access
            controls, and regular security audits. Individual survey responses
            are accessible only to authorized North Star Partners analysts.
          </p>

          <h2 className="mt-4 text-lg font-bold text-text-primary">
            Data Retention
          </h2>
          <p>
            We retain survey data and analysis results for the duration of our
            client engagement plus a reasonable period for follow-up services.
            Contact form submissions are retained as needed to respond to your
            inquiry. You may request deletion of your data at any time by
            contacting us.
          </p>

          <h2 className="mt-4 text-lg font-bold text-text-primary">
            Contact Us
          </h2>
          <p>
            If you have questions about this privacy policy or our data
            practices, please contact us at{" "}
            <a
              href="mailto:privacy@northstarpartners.org"
              className="text-nsp-blue-500 hover:underline"
            >
              privacy@northstarpartners.org
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
