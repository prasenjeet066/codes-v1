import React from "react"

export const metadata = {
  title: "Privacy Policy | desiiseb",
  description: "Read about how desiiseb collects, uses, and protects your personal information.",
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 prose prose-slate dark:prose-invert">
      <h1 className="mb-4 text-3xl font-bold">Privacy Policy</h1>
      <p className="text-sm text-gray-500">Last updated: July 11, 2025</p>

      <h2 className="mt-8 text-2xl font-semibold">1. Introduction</h2>
      <p>
        Your privacy is important to us. This Privacy Policy explains how desiiseb ("we", "our", or "us") collects,
        uses, discloses, and safeguards your information when you use our platform.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">2. Information We Collect</h2>
      <p>
        We may collect personal information that you voluntarily provide to us when you register on the platform,
        create content, or engage in other activities. The information may include your name, email address, profile
        photo, preferred language, and any other details you choose to share.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">3. How We Use Your Information</h2>
      <ul>
        <li>To provide, operate, and maintain our services.</li>
        <li>To improve, personalise, and expand our platform.</li>
        <li>To understand and analyse how you use our services.</li>
        <li>To communicate with you, either directly or through one of our partners, for customer service and updates.</li>
        <li>To process your transactions and manage your requests.</li>
        <li>To find and prevent fraud.</li>
      </ul>

      <h2 className="mt-8 text-2xl font-semibold">4. Sharing Your Information</h2>
      <p>
        We do not sell or rent your personal data to third parties. We may share information with service providers who
        perform services for us, strictly for the purposes described in this policy and under confidentiality
        agreements.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">5. Security</h2>
      <p>
        We use administrative, technical, and physical security measures to help protect your personal information.
        While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee its
        absolute security.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">6. Your Choices</h2>
      <p>
        You can review, update, or delete your personal information at any time by accessing your account settings or
        contacting us directly. You may also opt out of receiving promotional communications.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">7. Changes to This Policy</h2>
      <p>
        We may update our Privacy Policy from time to time. Any changes will be posted on this page with an updated
        revision date.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">8. Contact Us</h2>
      <p>
        If you have any questions or concerns about this Privacy Policy, please contact us at
        <a href="mailto:support@desiiseb.com" className="text-blue-600 underline"> support@desiiseb.com</a>.
      </p>
    </main>
  )
}