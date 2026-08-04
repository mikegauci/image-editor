"use server";

import { createClient } from "@/lib/supabase/server";

const BUCKET = "editor-exports";
const MAX_BYTES = 5 * 1024 * 1024;

export type UploadResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

export async function uploadExport(formData: FormData): Promise<UploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "Sign in to save to Supabase Storage." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Missing file." };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File is too large (max 5 MB)." };
  }

  const type = file.type;
  if (type !== "image/png" && type !== "image/jpeg") {
    return { ok: false, error: "Only PNG and JPEG are allowed." };
  }

  const ext = type === "image/jpeg" ? "jpg" : "png";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: type,
    upsert: false,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, path };
}
