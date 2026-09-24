import { SignUp } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-end px-12 py-16 lg:flex">
        <p className="text-xs uppercase tracking-[0.18em]">Fravia</p>
        <h1 className="mt-6 max-w-md font-serif text-6xl leading-[1.02]">
          Ein Konto. Danach eine Ausrichtung.
        </h1>
      </section>
      <section className="flex items-center justify-center px-4 py-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/"
        />
      </section>
    </main>
  );
}
