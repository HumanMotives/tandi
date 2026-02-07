import React, { useEffect, useState } from "react";
import "./worldSelect.css";

const IMG_BASE = "/assets/img/backgrounds";
const ICON_BASE = "/assets/img/icons";

const WORLDS = [
  {
    id: 1,
    key: "W1",
    img: `${IMG_BASE}/ds_background_junglerock.png`,
    lessonJson: "/levels/W1-L1.json",
    locked: false,
    href: "/lesson/W1-L1",
  },
  {
    id: 2,
    key: "W2",
    img: `${IMG_BASE}/ds_achtergrond_seajam.png`,
    lessonJson: "/levels/W2-L1.json",
    locked: true,
    href: "/lesson/W2-L1",
  },
  {
    id: 3,
    key: "W3",
    img: `${IMG_BASE}/ds_achtergrond_desertjam.png`,
    lessonJson: "/levels/W3-L1.json",
    locked: true,
    href: "/lesson/W3-L1",
  },
  {
    id: 4,
    key: "W4",
    img: `${IMG_BASE}/ds_achtergrond_ritmefabriek.png`,
    lessonJson: "/levels/W4-L1.json`,
    locked: true,
    href: "/lesson/W4-L1",
  },
  {
    id: 5,
    key: "W5",
    img: `${IMG_BASE}/ds_background_highschoolrock.png`,
    lessonJson: "/levels/W5-L1.json",
    locked: true,
    href: "/lesson/W5-L1",
  },
  {
    id: 6,
    key: "W6",
    img: `${IMG_BASE}/ds_achtergrond_galaxyrock.png`,
    lessonJson: "/levels/W6-L1.json",
    locked: true,
    href: "/lesson/W6-L1",
  },
];

export default function WorldSelect() {
  const [meta, setMeta] = useState({});

  useEffect(() => {
    async function loadMeta() {
      const result = {};

      for (const world of WORLDS) {
        try {
          const res = await fetch(world.lessonJson);
          const json = await res.json();

          result[world.key] = {
            title: json.worldTitle || `Wereld ${world.id}`,
            description: json.worldDescription || "",
          };
        } catch {
          result[world.key] = {
            title: `Wereld ${world.id}`,
            description: "",
          };
        }
      }

      setMeta(result);
    }

    loadMeta();
  }, []);

  function onWorldClick(world) {
    if (world.locked) return;
    window.location.href = world.href;
  }

  return (
    <div className="dsWorlds">
      <h1 className="dsWorldsHeader">DRUM WERELDEN</h1>

      <div className="dsWorldGrid">
        {WORLDS.map((world) => {
          const m = meta[world.key] || {};

          return (
            <div key={world.key} className="dsWorldCard">
              <div
                className={`dsWorldCircle ${world.locked ? "locked" : ""}`}
                onClick={() => onWorldClick(world)}
                role={!world.locked ? "button" : undefined}
              >
                <img
                  src={world.img}
                  alt={m.title}
                  className="dsWorldImage"
                  draggable="false"
                />

                <img
                  src={
                    world.locked
                      ? `${ICON_BASE}/ds_icon_lock.png`
                      : `${ICON_BASE}/ds_icon_play.png`
                  }
                  className={`dsWorldIcon ${
                    world.locked ? "lock" : "play"
                  }`}
                  alt=""
                  draggable="false"
                />
              </div>

              <div className="dsWorldText">
                <div className="dsWorldTitle">{m.title}</div>
                <div className="dsWorldDesc">
                  {(m.description || "").split("\n").map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
