import { SignInButton } from "@clerk/expo/web";

export function HostedSignInButton() {
  return (
    <SignInButton mode="redirect" forceRedirectUrl="/">
      <button
        type="button"
        className="min-h-12 w-full cursor-pointer rounded-pill border-0 bg-accent px-xl font-sans text-label font-semibold text-inverse transition-opacity hover:opacity-90 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Continue with Clerk
      </button>
    </SignInButton>
  );
}
