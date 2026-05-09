import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAFAFA] to-[#E2E8F0] p-4">
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center font-black text-[#0f766e] text-lg">
          X
        </div>
        <span className="font-extrabold text-xl tracking-wider text-[#0f172a]">ORG X-RAY</span>
      </div>
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" afterSignInUrl="/dashboard" />
    </div>
  );
}
