// Both reads remain server-backed. Deletion wins even if its protected profile
// cannot be read, and a failed deletion check never grants app access.
export async function readSignInAccount<T>(readDeletion: () => Promise<boolean>, readProfile: () => Promise<T | null>) {
  const profile = Promise.resolve().then(readProfile).then(
    (record) => ({ ok: true as const, record }),
    (error: unknown) => ({ ok: false as const, error })
  );
  if (await readDeletion()) return { deleting: true as const, record: null };
  const result = await profile;
  if (!result.ok) throw result.error;
  return { deleting: false as const, record: result.record };
}
