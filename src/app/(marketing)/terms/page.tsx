import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="mb-8 text-3xl font-extrabold text-text-primary">
          Terms of Service
        </h1>
        <div className="flex flex-col gap-6 text-sm leading-relaxed text-text-secondary">
          <p>
            <strong className="text-text-primary">Last updated:</strong> March
            2026
          </p>
          <p>
            These Terms of Service govern your use of the North Star Partners
            website and platform. By accessing or using our services, you agree
            to these terms.
          </p>

          <h2 className="mt-4 text-lg font-bold text-text-primary">
            Services
          </h2>
          <p>
            North Star Partners provides organizational consulting services
            including survey design and deployment, data analysis, and reporting.
            Specific services are defined in individual client engagement
            agreements.
          </p>

          <h2 className="mt-4 text-lg font-bold text-text-primary">
            Client Portal Access
          </h2>
          <p>
            Access to the client portal is provided via secure magic links sent
            to authorized contacts. You are responsible for protecting access to
            any portal links shared with you. Do not forward portal access links
            to unauthorized individuals.
          </p>

          <h2 className="mt-4 text-lg font-bold text-text-primary">
            Confidentiality
          </h2>
          <p>
            All survey data, analysis results, and reports are confidential to
            the commissioning organization. Recipients of reports and dashboard
            access agree not to distribute confidential findings outside the
            scope authorized by their organization.
          </p>

          <h2 className="mt-4 text-lg font-bold text-text-primary">
            Intellectual Property
          </h2>
          <p>
            All survey instruments, analytical methodologies, platform software,
            and report designs are the intellectual property of North Star
            Partners. Clients retain ownership of their raw survey response data.
          </p>

          <h2 className="mt-4 text-lg font-bold text-text-primary">
            Limitation of Liability
          </h2>
          <p>
            Our consulting services provide data-driven insights and
            recommendations. Implementation decisions remain the responsibility
            of the client organization. North Star Partners is not liable for
            business outcomes resulting from actions taken based on our analysis.
          </p>

          <h2 className="mt-4 text-lg font-bold text-text-primary">
            Contact
          </h2>
          <p>
            For questions about these terms, contact us at{" "}
            <a
              href="mailto:legal@northstarpartners.org"
              className="text-nsp-blue-500 hover:underline"
            >
              legal@northstarpartners.org
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
