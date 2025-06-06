import {
  TicketCreateType,
  TicketCreateSchema,
  TicketUpdateType,
  TicketUpdateSchema,
} from "@/app/types/tickets.type";
import { createClient } from "@/utils/supabase/client";
import { useMutation, useQuery, QueryClient } from "@tanstack/react-query";
import { NextResponse } from "next/server";
import { z } from "zod";

const queryClient = new QueryClient();

// --- Ticket Routes ---
export const getAllTickets = async () => {
  try {
    const supabase = await createClient();
    // get all tickets and fetch their collaborators by using a join query, and add it to the ticket object on assignees property
    const { data, error } = await supabase
      .from("tickets")
      .select(
        `*, ticket_assignees (user_id), users (id, first_name, last_name, email)`
      );

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
};

export const getTicketById = async (id: string) => {
  try {
    if (!id) {
      return NextResponse.json({ error: "Le champ ID est requis" });
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tickets")
      .select(
        `*, ticket_assignees (user_id), users (id, first_name, last_name, email)`
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
};

export const createTicket = async (Ticket: TicketCreateType) => {
  try {
    const parsedBody = TicketCreateSchema.parse(Ticket);

    if (!parsedBody) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.from("tickets").insert([
      {
        ...parsedBody,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

export const updateTicket = async (id: string, Ticket: TicketUpdateType) => {
  try {
    if (!id) {
      return NextResponse.json({ error: "Le champ ID est requis" });
    }

    const parsedBody = TicketUpdateSchema.parse(Ticket);

    if (!parsedBody) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tickets")
      .update({
        ...parsedBody,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};

export const deleteTicket = async (id: string) => {
  try {
    if (!id) {
      return NextResponse.json({ error: "Le champ ID est requis" });
    }
    const supabase = await createClient();
    const { error } = await supabase.from("tickets").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json(
      { message: "Ticket deleted successfully" },
      { status: 204 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};

export const assignUserToTicket = async (
  ticketId: string,
  userId: string
) => {
  try {
    if (!ticketId || !userId) {
      return NextResponse.json({ error: "Le champ ID est requis" });
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ticket_assignees")
      .insert([{ ticket_id: ticketId, user_id: userId }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// --- useQuery and useMutation Hooks ---
export const useGetAllTickets = () => {
  return useQuery({ queryKey: ["tickets"], queryFn: getAllTickets });
};

export const useGetTicketById = (id: string) => {
  return useQuery({
    queryKey: ["frame", id],
    queryFn: () => getTicketById(id),
    enabled: !!id,
  });
};

export const useCreateTicket = () => {
  return useMutation({
    mutationFn: (column: TicketCreateType) => createTicket(column),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
};

export const useUpdateTicket = () => {
  return useMutation({
    mutationFn: ({ id, column }: { id: string; column: TicketUpdateType }) =>
      updateTicket(id, column) as Promise<unknown>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
};

export const useDeleteTicket = () => {
  return useMutation({
    mutationFn: (id: string) => deleteTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
};

export const useAssignUserToTicket = () => {
  return useMutation({
    mutationFn: ({ ticketId, userId }: { ticketId: string; userId: string }) =>
      assignUserToTicket(ticketId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}