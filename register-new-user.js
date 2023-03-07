import sessionHandler from "@Helpers/Auth/sessionHandler";
import UserServerService from "@Services/server/UserService";
import { SessionMiddleware } from "middlewares/checkSession.middleware";
import { getSession } from "next-auth/client";

export async function registerNewUser(req, res) {
    const isAuth = await SessionMiddleware(req, res);

    if (!isAuth) {
        return res.status(401).json({});
    }

    const session = await getSession({ req });

    try {
        const data = await UserServerService.registerNewUser({...req.body, ...{token: session.accessToken}})

        return res.status(200).json(data);
    } catch (e) {
        return res.status(500).json(e);
    }
}

export default function handler(req, res) {
    if (req.method === "POST") {
        registerNewUser(req, res);
    } else {
        return res.status(405).json();
    }
}
