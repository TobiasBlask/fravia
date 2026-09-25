"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useLang } from "@/components/lang";

const appearance = {
  variables: {
    colorBackground: "#f6f1ea",
    colorForeground: "#1c1917",
    colorPrimary: "#1c1917",
    colorPrimaryForeground: "#f6f1ea",
    colorInputBackground: "#f6f1ea",
    colorInputForeground: "#1c1917",
    colorNeutral: "#1c1917",
    borderRadius: "0px",
    fontFamily: "var(--font-figtree), sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full bg-transparent p-0 shadow-none",
    header: "hidden",
    footer: "bg-transparent",
    socialButtonsBlockButton: "shadow-none",
    formButtonPrimary: "shadow-none",
  },
};

export function AccountScreen({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { t } = useLang();
  return (
    <main className="fravia-account mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="font-serif text-4xl leading-none">Fravia</p>
      <h1 className="mt-10 font-serif text-3xl leading-tight">{t("gateTitle")}</h1>
      <div className="mt-10">
        {mode === "sign-in" ? (
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/" appearance={appearance} />
        ) : (
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/" appearance={appearance} />
        )}
      </div>
    </main>
  );
}
