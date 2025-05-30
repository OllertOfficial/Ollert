import {
  UserCreateType,
  UserCreateSchema,
  UserUpdateType,
  UserUpdateSchema,
} from "@/app/types/users.type";
import { createClient } from "@/utils/supabase/client";
import { useMutation, useQuery, QueryClient } from "@tanstack/react-query";
import { NextResponse } from "next/server";
import { z } from "zod";

const queryClient = new QueryClient();

// --- User Routes ---
export const getLoggedUser = async () => {
    try {
		const supabase = await createClient();
        const { data, error } = await supabase.auth.getUser();
        if (error) {
            console.error("Error fetching logged user:", error.message);
            return null;
        }
        return data.user; // Return parsed user data
    } catch (err) {
        console.error("Unexpected error in getLoggedUser:", err);
        return null;
    }
};
export const getAllUsers = async () => {
  try {
	const supabase = await createClient();
    const { data, error } = await supabase.from("users").select("*");

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
};

export const getAllNonCollaboratorUsers = async (frameId: string) => {
  try {
	const supabase = await createClient();
    const { data: collaborators, error: collabError } = await supabase
      .from("frame_collaborators")
      .select("user_id")
      .eq("frame_id", frameId);

    if (collabError) throw collabError;

    const userIds = collaborators.map((c) => c.user_id);

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .not("id", "in", `(${userIds.join(",")})`);

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
};

export const getAllCollaboratorUsers = async (frameId: string) => {
  try {
      const supabase = await createClient();
    const { data: collaborators, error: collabError } = await supabase
      .from("frame_collaborators")
      .select("user_id")
      .eq("frame_id", frameId);

    if (collabError) throw collabError;

    const userIds = collaborators.map((c) => c.user_id);

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .in("id", userIds);

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export const getUserById = async (id: string) => {
  try {
    if (!id) {
      return NextResponse.json({ error: "Le champ ID est requis" });
    }
	const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
};

export const createUser = async (User: UserCreateType) => {
  try {
    const parsedBody = UserCreateSchema.parse(User);

    if (!parsedBody) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

	const supabase = await createClient();
    const { data, error } = await supabase.from("users").insert([
      {
        ...parsedBody,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: (error as z.ZodError).errors },
        { status: 400 }
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};

export const updateUser = async (id: string, User: UserUpdateType) => {
  try {
    if (!id) {
      return NextResponse.json({ error: "Le champ ID est requis" });
    }

    const parsedBody = UserUpdateSchema.parse(User);

    if (!parsedBody) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

	const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .update({
        ...parsedBody,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

	// update the email in the auth table
	// update the name in the auth table
	const { error: authError } = await supabase.auth.updateUser({
		email: parsedBody.email,
	  	data: { name: parsedBody.name },
	});

	if (authError) throw authError;

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};

export const updateUserPassword = async (id: string, password: string) => {
	try {
		if (!id) {
		return NextResponse.json({ error: "Le champ ID est requis" });
		}

		if (!password) {
		return NextResponse.json({ error: "Le champ mot de passe est requis" });
		}

		const supabase = await createClient();
		const { error } = await supabase.auth.updateUser({
		password,
		});

		if (error) throw error;

		return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

export const deleteUser = async (id: string) => {
  try {
    if (!id) {
      return NextResponse.json({ error: "Le champ ID est requis" });
    }

	const supabase = await createClient();
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 204 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};

// --- useQuery and useMutation Hooks ---

export const useGetLoggedUser = () => {
    return useQuery({
        queryKey: ["loggedUser"],
        queryFn: getLoggedUser,
    });
};

export const useGetAllUsers = () => {
  return useQuery({ queryKey: ["users"], queryFn: getAllUsers });
};

export const useGetUserById = (id: string) => {
  return useQuery({
    queryKey: ["frame", id],
    queryFn: () => getUserById(id),
    enabled: !!id,
  });
};

export const useCreateUser = () => {
  return useMutation({
    mutationFn: (column: UserCreateType) => createUser(column),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useUpdateUser = () => {
  return useMutation({
    mutationFn: ({ id, column }: { id: string; column: UserUpdateType }) =>
      updateUser(id, column) as Promise<unknown>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useUpdateUserPassword = () => {
  return useMutation({
	mutationFn: ({ id, password }: { id: string; password: string }) =>
	  updateUserPassword(id, password) as Promise<unknown>,
	onSuccess: () => {
	  queryClient.invalidateQueries({ queryKey: ["users"] });
	},
  });
};

export const useDeleteUser = () => {
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
