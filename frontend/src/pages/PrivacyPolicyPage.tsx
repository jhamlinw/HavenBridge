import { Link } from 'react-router-dom';

const LAST_UPDATED = 'April 6, 2026';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <article className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 px-6 sm:px-10 py-10">
        <header className="mb-10 pb-8 border-b border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mt-2">Last updated: {LAST_UPDATED}</p>
        </header>

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Information We Collect</h2>
            <p className="text-base leading-relaxed">
              HavenBridge collects only the information necessary to operate our nonprofit safehouse network and
              support vulnerable residents. This may include identifiers and contact details for staff and authorized
              partners, case-related records needed to coordinate care (such as referral context and service notes,
              where permitted by law), donation and financial transaction data, and technical data from our systems
              (for example IP address and device type) when you use our websites or applications. We do not collect
              more sensitive information than our mission requires, and we limit access to those with a legitimate need
              to know.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">How We Use Information</h2>
            <p className="text-base leading-relaxed">
              We use collected information to provide and improve housing, counseling, and related services; to
              comply with legal and safeguarding obligations; to process donations and issue receipts; to communicate with
              stakeholders about programs and impact (where you have not opted out); and to secure our platforms
              against misuse. Data about residents is used solely for care coordination, reporting as required by
              regulators or funders, and continuous improvement of our services—not for unrelated marketing or
              profiling.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Protection</h2>
            <p className="text-base leading-relaxed">
              We treat information about vulnerable individuals with heightened care. Access is role-based, activity is
              logged where appropriate, and we employ administrative, technical, and organizational measures designed
              to protect against unauthorized access, loss, or alteration. Staff receive training on confidentiality and
              data handling. While no system is perfectly secure, we regularly review our practices and work with
              partners who meet comparable standards when they process data on our behalf.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Cookies</h2>
            <p className="text-base leading-relaxed">
              Our sites may use cookies and similar technologies to remember preferences, maintain secure sessions, and
              understand aggregate usage so we can improve accessibility and performance. Essential cookies may be
              required for the service to function. Where non-essential cookies are used, we seek your consent where
              required by law. You can control cookies through your browser settings; disabling some cookies may limit
              certain features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Third-Party Services</h2>
            <p className="text-base leading-relaxed">
              We may use trusted third parties for hosting, email, analytics, payment processing, or professional
              services. These providers may process data only according to our instructions and applicable agreements,
              and only to the extent needed for their service. We do not sell personal information. If we transfer data
              across borders, we do so with appropriate safeguards as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h2>
            <p className="text-base leading-relaxed">
              Depending on where you live, you may have rights to access, correct, delete, or restrict processing of
              your personal data, to object to certain processing, to data portability, and to withdraw consent where
              processing is consent-based. Residents and families may have additional protections under safeguarding and
              social-services law; we will respond to lawful requests in line with those frameworks. You may also lodge
              a complaint with a supervisory authority where applicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Us</h2>
            <p className="text-base leading-relaxed">
              For questions about this policy, to exercise your privacy rights, or to report a concern, please contact
              HavenBridge using the contact details published on our main website or provided to you as a resident,
              donor, or partner. We will acknowledge requests within a reasonable time and work with you in good faith
              to resolve issues.
            </p>
          </section>
        </div>

        <p className="mt-12 pt-8 border-t border-gray-100 text-center">
          <Link to="/welcome" className="text-haven-600 hover:text-haven-700 font-medium text-sm">
            Back to home
          </Link>
        </p>
      </article>
    </div>
  );
}
