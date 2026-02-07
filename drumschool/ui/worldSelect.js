const React = window.React;

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
    lessonJson: "/levels/W4-L1.json",
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

function WorldSelect() {
  const h = React.createElement;
  const useState = React.useState;
  const useEffect = React.useEffect;

  const [meta, setMeta] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      const out = {};

      for (const world of WORLDS) {
        try {
          const res = await fetch(world.lessonJson, { cache: "no-store" });
          if (!res.ok) throw new Error();
          const json = await res.json();

          out[world.key] = {
            title: json.worldTitle || `Wereld ${world.id}`,
            description: json.worldDescription || "",
          };
        } catch {
          out[world.key] = {
            title: `Wereld ${world.id}`,
            description: "",
          };
        }
      }

      if (!cancelled) setMeta(out);
    }

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleClick(world) {
    if (world.locked) return;
    window.location.href = world.href;
  }

  return h(
    "div",
    { className: "dsWorlds" },

    h("h1", { className: "dsWorldsHeader" }, "DRUM WERELDEN"),

    h(
      "div",
      { className: "dsWorldGrid" },
      WORLDS.map((world) => {
        const m = meta[world.key] || {};
        const title = m.title || `Wereld ${world.id}`;
        const description = m.description || "";

        const circleClass =
          "dsWorldCircle" + (world.locked ? " locked" : "");

        const circleProps = world.locked
          ? { className: circleClass }
          : {
              className: circleClass,
              role: "button",
              tabIndex: 0,
              onClick: () => handleClick(world),
              onKeyDown: (e) => {
                if (e.key === "Enter" || e.key === " ") handleClick(world);
              },
            };

        const iconSrc = world.locked
          ? `${ICON_BASE}/ds_icon_lock.png`
          : `${ICON_BASE}/ds_icon_play.png`;

        const iconClass =
          "dsWorldIcon " + (world.locked ? "lock" : "play");

        return h(
          "div",
          { key: world.key, className: "dsWorldCard" },

          h(
            "div",
            circleProps,
            h("img", {
              src: world.img,
              alt: title,
              className: "dsWorldImage",
              draggable: "false",
            }),
            h("img", {
              src: iconSrc,
              alt: "",
              className: iconClass,
              draggable: "false",
            })
          ),

          h(
            "div",
            { className: "dsWorldText" },
            h("div", { className: "dsWorldTitle" }, title),
            h(
              "div",
              { className: "dsWorldDesc" },
              description
                ? description.split("\n").map((line, i) =>
                    h("div", { key: i }, line)
                  )
                : null
            )
          )
        );
      })
    )
  );
}

window.WorldSelect = WorldSelect;
