import { auth } from "./src/lib/auth/server";

async function test() {
  try {
    const res = await auth.api.signUpEmail({
      body: {
        email: "manager@test.com",
        password: "TempPassword123!",
        name: "Manager",
      },
    });
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
