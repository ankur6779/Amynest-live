import { Link } from "wouter";

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: `By accessing or using AmyNest AI ("the Service") available at amynest.in, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service. These Terms apply to all visitors, users, and others who access or use the Service.`,
  },
  {
    title: "2. Description of Service",
    body: `AmyNest AI is an AI-powered parenting platform that provides personalized routine planning, meal suggestions, child development guidance, behavior tracking, and related tools for parents and guardians. The Service is operated by AmyNest AI, Inc.`,
  },
  {
    title: "3. Eligibility",
    body: `You must be at least 18 years old and a parent or legal guardian to use the Service. By using the Service you represent and warrant that you meet these requirements. The Service is not directed to children under 13, and children must not create accounts or use the Service directly.`,
  },
  {
    title: "4. Account Registration",
    body: `You must create an account to access most features. You agree to provide accurate, current, and complete information during registration and to keep your account credentials confidential. You are responsible for all activity that occurs under your account. Notify us immediately at support@amynest.in if you suspect unauthorised use of your account.`,
  },
  {
    title: "5. Subscription and Payments",
    body: `Certain features require a paid subscription ("Premium"). Subscription fees are charged in advance on a monthly or annual basis as selected. All fees are non-refundable except as required by applicable law. We reserve the right to change pricing with 30 days' notice. Failure to pay may result in suspension or downgrade of your account to the free tier.`,
  },
  {
    title: "6. Free Trial",
    body: `We may offer a free trial period for Premium features. After the trial ends, your account will revert to the free tier unless you subscribe. We reserve the right to modify or discontinue free trial offers at any time.`,
  },
  {
    title: "7. Acceptable Use",
    body: `You agree not to: (a) use the Service for any unlawful purpose; (b) upload or transmit harmful, offensive, or infringing content; (c) attempt to reverse-engineer, scrape, or extract data from the Service; (d) use automated tools to access the Service without our permission; (e) impersonate any person or entity; or (f) interfere with the security or integrity of the Service.`,
  },
  {
    title: "8. AI-Generated Content",
    body: `The Service uses artificial intelligence to generate routines, meal plans, advice, and other content. AI-generated content is for informational purposes only and does not constitute medical, nutritional, psychological, or professional advice. Always consult a qualified professional for health or developmental concerns regarding your child. We do not guarantee the accuracy or completeness of AI-generated content.`,
  },
  {
    title: "9. Child Data",
    body: `You may enter information about your children (such as name, age, and interests) to personalise the Service. You represent that you are the parent or legal guardian of any child whose data you enter. We handle child data in accordance with our Privacy Policy. We do not knowingly allow children to create accounts or submit personal information directly.`,
  },
  {
    title: "10. Intellectual Property",
    body: `All content, features, and functionality of the Service — including text, graphics, logos, icons, and software — are the exclusive property of AmyNest AI, Inc. and are protected by applicable intellectual property laws. You may not copy, reproduce, distribute, or create derivative works without our express written permission. Content you create using the Service (such as saved routines) remains yours; you grant us a limited licence to store and process it to deliver the Service.`,
  },
  {
    title: "11. Privacy",
    body: `Your use of the Service is also governed by our Privacy Policy, available at amynest.in/privacy. By using the Service you consent to the collection and use of your information as described in the Privacy Policy.`,
  },
  {
    title: "12. Third-Party Services",
    body: `The Service integrates with third-party providers (such as Firebase for authentication and OpenAI for AI features). Your use of those services is subject to their respective terms and privacy policies. We are not responsible for the practices of third-party providers.`,
  },
  {
    title: "13. Disclaimer of Warranties",
    body: `The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.`,
  },
  {
    title: "14. Limitation of Liability",
    body: `To the fullest extent permitted by law, AmyNest AI, Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, even if we have been advised of the possibility of such damages. Our total liability for any claim arising from the Service shall not exceed the amount you paid us in the 12 months preceding the claim.`,
  },
  {
    title: "15. Termination",
    body: `We may suspend or terminate your account at any time for violation of these Terms or for any other reason with or without notice. Upon termination, your right to use the Service ceases immediately. You may also delete your account at any time from within the app or by contacting support@amynest.in. Sections 10, 13, 14, and 16 survive termination.`,
  },
  {
    title: "16. Governing Law",
    body: `These Terms are governed by the laws of India. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts located in India. If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force.`,
  },
  {
    title: "17. Changes to These Terms",
    body: `We may update these Terms from time to time. When we do, we will update the "Last updated" date at the top of this page. If changes are material, we will notify you via email or an in-app notice. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.`,
  },
  {
    title: "18. Contact Us",
    body: `If you have questions about these Terms, please contact us at support@amynest.in or visit amynest.in.`,
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50">
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/">
            <span className="flex items-center gap-2 cursor-pointer">
              <img src="/amynest-logo.png" alt="AmyNest AI" className="h-8 w-8 rounded-full" />
              <span
                className="font-quicksand text-lg font-black"
                style={{
                  background: "linear-gradient(90deg,#A855F7,#EC4899,#06B6D4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AmyNest AI
              </span>
            </span>
          </Link>
          <Link href="/">
            <span className="text-sm text-slate-500 hover:text-slate-800 cursor-pointer">← Home</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="mb-2 text-3xl font-black text-slate-900">Terms of Service</h1>
        <p className="mb-8 text-sm text-slate-400">Last updated: April 27, 2026</p>

        <p className="my-3 leading-relaxed text-slate-700">
          Please read these Terms of Service carefully before using <strong>AmyNest AI</strong> at{" "}
          <a href="https://amynest.in" className="text-indigo-600 underline hover:text-indigo-800">
            amynest.in
          </a>
          . These Terms form a legally binding agreement between you and AmyNest AI, Inc.
        </p>

        {sections.map((s) => (
          <section key={s.title} className="mt-8">
            <h2 className="mb-3 text-xl font-bold text-slate-900">{s.title}</h2>
            <p className="leading-relaxed text-slate-700">{s.body}</p>
          </section>
        ))}
      </main>

      <footer className="border-t border-slate-200 bg-white/60 py-6">
        <p className="text-center text-xs text-slate-400">© 2026 AmyNest AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
