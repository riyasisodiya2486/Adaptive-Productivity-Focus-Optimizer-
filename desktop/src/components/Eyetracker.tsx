import React, {useEffect, useState} from "react";

interface Coordinates {
    x: number;
    y: number;
}

const EyeTracker: React.FC = () => {
    const [coords, setCoords] = useState<Coordinates | null>(null);

    useEffect(() => {
        if(!(window as any).webgazer) {
            console.error("webgazer.js not loaded!");
            return;
        }

        const webgazer = (window as any).webgazer;

        webgazer.setGazeListner((data: any, timestamp: any) => {
            if(data) {
                setCoords({ x: data.x, y: data.y});
            }
        });

        webgazer.begin();

        return () => {
            webgazer.end();
        }
    }, []);

    return (
        <div>
            <h3>Eye Tracker</h3>
            {coords ? (
                <p>
                    Gaze Coordinates: X: {Math.round(coords.x)}, Y: {Math.round(coords.y)}
                </p>
            ) : (
                <p>Detecting eye movement...</p>
            )}
        </div>
    )
};

export default EyeTracker;