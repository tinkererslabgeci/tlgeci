import React from "react";



const upcomingEvents = [
  {
    title: "Orientation + Lab Walkthrough",
    date: "TBD",
    time: "TBD",
    venue: "Tinkerers Lab, GECI",
    description:
      "A quick walkthrough of the lab, tools, safety rules, and how to start your first build.",
    registrationUrl: "https://forms.gle/your-form-link",
    posterSrc: "/posters/events/poster-orientation.svg",
    posterAlt: "Orientation event poster",
  },
  {
    title: "Lab Inauguration",
    date: "TBD",
    time: "TBD",
    venue: "Tinkerers Lab, GECI",
    description:
      "Official inauguration of the Tinkerers Lab — join us for the opening and a quick showcase of tools and ongoing projects.",
    registrationUrl: "https://forms.gle/your-form-link",
    posterSrc: "/posters/events/poster-orientation.svg",
    posterAlt: "Lab inauguration poster",
  },
  {
    title: "Electronics Basics Workshop",
    date: "TBD",
    time: "TBD",
    venue: "Tinkerers Lab, GECI",
    description:
      "Hands-on session covering components, breadboarding, and simple circuits.",
    registrationUrl: "https://forms.gle/your-form-link",
    posterSrc: "/posters/events/poster-electronics.svg",
    posterAlt: "Electronics workshop poster",
  },
  {
    title: "Project Build Day",
    date: "2026-02-28",
    time: "4:00 PM",
    venue: "Tinkerers Lab, GECI",
    description:
      "Bring your idea and build with the community. Mentors will be around to help.",
    registrationUrl: "https://forms.gle/your-form-link",
    posterSrc: "/posters/events/poster-buildday.svg",
    posterAlt: "Project build day poster",
  },
  {
    title: "ESP32 Bootcamp (2 Days) — First Years",
    date: "2026-03-07 to 2026-03-08",
    time: "4:00 PM",
    venue: "Tinkerers Lab, GECI",
    description:
      "2-day beginner bootcamp: setup, basics of ESP32, sensors, and a small Wi‑Fi project.",
    registrationUrl: "https://forms.gle/your-form-link",
    posterSrc: "/posters/events/poster-esp32-bootcamp.svg",
    posterAlt: "ESP32 bootcamp poster",
  },
];

const pastEvents = [
  {
    title: "Lab Setup & Installing",
    date: "2026-02-05",
    time: "4:00 PM",
    venue: "Tinkerers Lab, GECI",
    description:
      "Initial lab setup, installing tools, organizing equipment, and preparing the space.",
    posterSrc: "/posters/events/poster-lab-setup.svg",
    posterAlt: "Lab setup and installing poster",
  },
  {
    title: "Execom Training",
    date: "2026-02-12",
    time: "4:00 PM",
    venue: "Tinkerers Lab, GECI",
    description:
      "Execom onboarding: roles, workflow, event planning, and communication basics.",
    posterSrc: "/posters/execom/poster-execom-training.svg",
    posterAlt: "Execom training poster",
  },
  {
    title: "LEAP Workshop — 3D Printing",
    date: "2026-02-16",
    time: "4:00 PM",
    venue: "Tinkerers Lab, GECI",
    description:
      "Intro to 3D printing: slicing basics, printer setup, and a quick print demo.",
    posterSrc: "/posters/events/poster-3d-printing.svg",
    posterAlt: "3D printing workshop poster",
  },
];

function EventPosterCard({ event, index, showRegister }) {
  return (
    <article className="card mediaCard mediaLoad eventPosterCard" style={{ "--i": index }}>
      <div className="posterFrame eventPosterMedia">
        <img
          className="mediaImg"
          src={event.posterSrc}
          alt={event.posterAlt}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="eventPosterBody">
        <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{event.title}</div>
        <div style={{ marginTop: "0.5rem", color: "rgba(255, 255, 255, 0.70)", lineHeight: 1.35 }}>
          {event.date} • {event.time}
          <br />
          {event.venue}
        </div>
        <p style={{ marginBottom: 0, marginTop: "0.65rem", color: "rgba(255, 255, 255, 0.80)", lineHeight: 1.6 }}>
          {event.description}
        </p>

        {showRegister ? (
          <div style={{ marginTop: "0.85rem" }}>
            <a className="btn" href={event.registrationUrl} target="_blank" rel="noreferrer">
              Registration Link
            </a>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function EventsPage() {
  return (
    <div className="sectionStack">
      <header className="pageHeader">
        <h1 className="pageTitle">Events</h1>
        <p className="pageSubtitle">Upcoming events and past highlights.</p>
      </header>

      <section className="card" style={{ padding: "1.4rem" }}>
        <h2 className="sectionH3" style={{ margin: 0 }}>
          Upcoming Events
        </h2>
        <div className="grid cols-2" style={{ marginTop: "0.85rem" }}>
          {upcomingEvents.map((event, idx) => (
            <EventPosterCard key={event.title} event={event} index={idx} showRegister />
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: "1.4rem" }}>
        <h2 className="sectionH3" style={{ margin: 0 }}>
          Past Events
        </h2>
        <div className="grid cols-2" style={{ marginTop: "0.85rem" }}>
          {pastEvents.map((event, idx) => (
            <EventPosterCard key={event.title} event={event} index={idx} showRegister={false} />
          ))}
        </div>
      </section>
    </div>
  );
}
