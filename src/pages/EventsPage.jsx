import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { allEvents } from "../data/eventsData.js";

function getEventSlug(event) {
  if (event.slug) return event.slug;

  return event.title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toDateOnly(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sortByDateAsc(a, b) {
  const aDate = toDateOnly(a.startDate);
  const bDate = toDateOnly(b.startDate);

  if (!aDate && !bDate) return a.title.localeCompare(b.title);
  if (!aDate) return 1;
  if (!bDate) return -1;
  return aDate - bDate;
}

function sortByDateDesc(a, b) {
  const aDate = toDateOnly(a.endDate || a.startDate);
  const bDate = toDateOnly(b.endDate || b.startDate);

  if (!aDate && !bDate) return a.title.localeCompare(b.title);
  if (!aDate) return 1;
  if (!bDate) return -1;
  return bDate - aDate;
}

function EventPosterCard({ event, index, showRegister, onOpen }) {
  return (
    <article
      className="card mediaCard mediaLoad eventPosterCard"
      style={{ "--i": index }}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(event)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(event);
        }
      }}
      aria-label={`Open full details for ${event.title}`}
    >
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
          {event.dateLabel} • {event.time}
          <br />
          {event.venue}
        </div>
        <p className="eventDescriptionClamp" style={{ marginBottom: 0, marginTop: "0.65rem", color: "rgba(255, 255, 255, 0.80)", lineHeight: 1.6 }}>
          {event.description || "Click the poster to view full details."}
        </p>

        {showRegister ? (
          <div style={{ marginTop: "1.2rem" }}>
            <a className="btn btnRegister" href={event.registrationUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
              Register Now
            </a>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function EventDetailsModal({ event, showRegister, onClose }) {
  if (!event) return null;

  const fullDescription = event.fullDescription || event.description || "No additional description provided.";

  return (
    <div className="eventModalOverlay" onClick={onClose} role="presentation">
      <div className="eventModalCard" role="dialog" aria-modal="true" aria-label={`Event details: ${event.title}`} onClick={(e) => e.stopPropagation()}>
        <button className="eventModalClose" type="button" onClick={onClose} aria-label="Close event details">
          Close
        </button>

        <div className="eventModalGrid">
          <div className="posterFrame eventModalPoster">
            <img className="mediaImg" src={event.posterSrc} alt={event.posterAlt} loading="lazy" decoding="async" />
          </div>

          <div className="eventModalBody">
            <h3 className="eventModalTitle">{event.title}</h3>
            <p className="eventModalMeta">
              {event.dateLabel} • {event.time}
              <br />
              {event.venue}
            </p>
            <p className="eventModalDescription">{fullDescription}</p>

            {showRegister && event.registrationUrl ? (
              <div style={{ marginTop: "1.3rem" }}>
                <a className="btn btnRegister" href={event.registrationUrl} target="_blank" rel="noreferrer">
                  Register Now
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [activeEvent, setActiveEvent] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = [];
    const past = [];

    allEvents.forEach((event) => {
      const start = toDateOnly(event.startDate);
      const end = toDateOnly(event.endDate || event.startDate);

      if (!start || !end) {
        upcoming.push(event);
        return;
      }

      if (end < today) past.push(event);
      else upcoming.push(event);
    });

    return {
      upcomingEvents: upcoming.sort(sortByDateAsc),
      pastEvents: past.sort(sortByDateDesc),
    };
  }, []);

  const eventSlugParam = searchParams.get("event");

  useEffect(() => {
    if (!eventSlugParam) {
      setActiveEvent(null);
      return;
    }

    const matchedEvent = [...upcomingEvents, ...pastEvents].find((event) => getEventSlug(event) === eventSlugParam);
    setActiveEvent(matchedEvent || null);
  }, [eventSlugParam, upcomingEvents, pastEvents]);

  useEffect(() => {
    if (!activeEvent) return undefined;

    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;

      setActiveEvent(null);

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("event");
      setSearchParams(nextParams, { replace: true });
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeEvent, searchParams, setSearchParams]);

  const openEvent = (event) => {
    setActiveEvent(event);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("event", getEventSlug(event));
    setSearchParams(nextParams, { replace: true });
  };

  const closeEvent = () => {
    setActiveEvent(null);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("event");
    setSearchParams(nextParams, { replace: true });
  };
  const activeIsUpcoming = Boolean(activeEvent && upcomingEvents.some((event) => event.title === activeEvent.title));

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
            <EventPosterCard key={event.title} event={event} index={idx} showRegister onOpen={openEvent} />
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: "1.4rem" }}>
        <h2 className="sectionH3" style={{ margin: 0 }}>
          Past Events
        </h2>
        <div className="grid cols-2" style={{ marginTop: "0.85rem" }}>
          {pastEvents.map((event, idx) => (
            <EventPosterCard key={event.title} event={event} index={idx} showRegister={false} onOpen={openEvent} />
          ))}
        </div>
      </section>

      <EventDetailsModal event={activeEvent} showRegister={activeIsUpcoming} onClose={closeEvent} />
    </div>
  );
}
