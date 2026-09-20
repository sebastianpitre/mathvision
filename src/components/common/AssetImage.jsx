import React from "react";

import assets from "../../data/mock/assets.json";


export default function AssetImage({
    src,
    fallback,
    type = "player",
    alt = "",
    className = "",
    ...props
}) {

    const getFallback = () => {

        if (fallback) {
            return fallback;
        }

        if (type === "character") {
            return assets.characters.defaultAvatar;
        }

        if (type === "player") {
            return assets.players.defaultAvatar;
        }

        return null;
    };


    const handleError = (event) => {

        const fallbackImage = getFallback();

        if (!fallbackImage) {
            return;
        }

        if (event.currentTarget.dataset.fallbackApplied === "true") {
            return;
        }

        event.currentTarget.dataset.fallbackApplied = "true";
        event.currentTarget.src = fallbackImage;
    };


    return (
        <img
            src={src || getFallback()}
            alt={alt}
            className={className}
            onError={handleError}
            {...props}
        />
    );
}