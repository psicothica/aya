"use server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function enrollCourse(courseId: string) {
  const me = await getCurrentUser();
  if (!me) redirect(`/entrar?next=/cursos/${courseId}`);
  const supabase = createClient();
  await supabase.from("course_enrollments").upsert(
    { user_id: me.user.id, course_id: courseId, paid: false },
    { onConflict: "user_id,course_id", ignoreDuplicates: true },
  );
  revalidatePath(`/cursos/${courseId}`);
  redirect(`/cursos/${courseId}/aprender`);
}
