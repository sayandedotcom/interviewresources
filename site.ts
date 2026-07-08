export const siteConfig = {
  name: "Scouting Report",
  description: "Get the interview questions before they ask them.",
  url: "https://interviewquestions.ai",
  email: "[EMAIL_ADDRESS]",
  links: {
    twitter: "https://twitter.com/sayandedotcom",
    github: "https://github.com/sayandedotcom/interview-questions",
  },
  waitlist: false,
  activeAuth: false,
  enablePayments: false,
  keywords: [
    "interview questions",
    "interview prep",
    "company research",
    "technical interview",
    "job interview",
  ],
  pricingPlans: [
    {
      name: "Basic",
      price: 1,
      description: "Perfect for occasional prep",
      features: [
        "5 company reports per month",
        "Basic question predictions",
        "Email support",
      ],
    },
    {
      name: "Pro",
      price: 5,
      description: "For serious candidates",
      features: [
        "Unlimited company reports",
        "Advanced question predictions",
        "Interviewer research",
        "Priority support",
        "Export reports",
      ],
    },
  ],
};
