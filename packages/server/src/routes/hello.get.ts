//server/src/routes/hello.get.ts
export default defineEventHandler(() => {
  return { ok: true, message: "hello from nitro on workers" };
});
