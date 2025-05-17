import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const passwordSchema = z.object({
  password: z.string().min(1, "A jelszó megadása kötelező"),
});

type PasswordForm = z.infer<typeof passwordSchema>;

interface ModeratorAuthProps {
  isModerator: boolean;
  handleModeratorAuth: (password: string) => Promise<void>;
  loading: boolean;
  setIsModerator: (isModerator: boolean) => void;
}

function ModeratorAuth({ isModerator, handleModeratorAuth, loading, setIsModerator }: ModeratorAuthProps) {
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  return (
    <>
      {!isModerator && (
        <form onSubmit={passwordForm.handleSubmit(({ password }) => handleModeratorAuth(password))} className="mt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Moderátor jelszó</span>
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                {...passwordForm.register("password")}
                className="input input-bordered w-full"
                placeholder="Add meg a torna jelszavát"
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="loading loading-spinner"></span> : "Hitelesítés"}
              </button>
            </div>
            {passwordForm.formState.errors.password && (
              <span className="text-error text-sm">
                {passwordForm.formState.errors.password.message}
              </span>
            )}
          </div>
        </form>
      )}
      {isModerator && (
        <button
          className="btn btn-outline btn-warning mt-4"
          onClick={() => setIsModerator(false)}
          disabled={loading}
        >
          Kilépés moderátori módból
        </button>
      )}
    </>
  );
}

export default ModeratorAuth;