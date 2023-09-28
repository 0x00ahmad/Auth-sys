import { ZodError } from "zod";
import { LoginSchema, RegisterSchema } from "./auth.model";
import fastify, { FastifyRequest, FastifyReply } from "fastify";
import { createUser, getUser } from "./auth.services";
export async function loginController(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const parsedBody = LoginSchema.parse(req.body);
    const existingUser = await getUser(parsedBody.email);
    if (!existingUser) {
      reply.code(401).send("Invalid passowrd or email");
    }
    if (existingUser?.type === "OAUTH2") {
      reply.code(401).send("Invalid operation");
    }
    if (existingUser?.password !== parsedBody.password) {
      reply.code(401).send("Invalid passowrd or email");
    }
    if (existingUser?.password === parsedBody.password) {
      await req.server.redis.set(
        req.session.sessionId,
        JSON.stringify({ ...existingUser, sessionId: req.session.sessionId })
      );

      // TTL
      await req.server.redis.expire(req.session.sessionId, 180);
      reply.send("Authorized");
    }
  } catch (error: any) {
    if (error instanceof ZodError) {
      reply.status(400).send({ error: error.issues[0].message });
    } else {
      console.log(error);
      reply.status(500).send({ error: "Internal Server Error" });
    }
  }
}

export async function reigsterController(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const parsedBody = RegisterSchema.parse(req.body);
    await createUser(parsedBody);
    reply.code(201).send({ message: parsedBody });
  } catch (error: any) {
    if (error instanceof ZodError) {
      reply.status(400).send({ error: error.issues[0].message });
    } else {
      reply.status(500).send({ error: "Internal Server Error" });
    }
  }
}
