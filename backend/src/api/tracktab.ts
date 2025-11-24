import { Request, Response, Router } from "express";

const router = Router();

interface TabInfo{
    url: string;
    title: string;
    timestamp:  number;
}

const trackedTabs: TabInfo[] = [];

router.post("/trackTab", (req: Request, res: Response) => {
    const {url, title, timestamp } = req.body;

    if(!url || !title) {
        return res.status(400).json({
            error: "missing url or title"
        })
    }

    trackedTabs.push({
        url,
        title,
        timestamp: timestamp ?? Date.now(),
    });

    console.log("Tracked tab:", url, title);

    return res.status(200).json({
        message: "tab info received"
    });

    router.get("/trackedTabs", (_:Request, res: Response) => {
        res.json(trackedTabs)
    })
})

export default router;