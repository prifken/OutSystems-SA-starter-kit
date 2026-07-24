# Discovery Call Transcript — Harborline Logistics (fictional)

> Fictional company, fictional people. This transcript is a test input for
> the golden fixture in this folder — see `README.md` for what it's for and
> how it's used. It is written the way a real discovery call sounds:
> conversational, meandering, with the actual requirements mixed in among
> small talk and asides rather than delivered as a clean spec. Some needs
> below map cleanly onto existing `os-*` components, some only make sense
> as combinations of the Tier 2 primitives, one need doesn't fit either
> cleanly, and one request is deliberately out of scope for this kit.

**Participants:** Dana Whitfield (VP Operations, Harborline Logistics),
Marcus Ilo (OutSystems SA), Priya Anand (Harborline IT lead, joins ~15
min in)

---

**Dana:** Sorry, one sec — can you still hear me? I was on a call with a
carrier about a load that's stuck at the border and it ran long.

**Marcus:** Loud and clear. No rush, take your time.

**Dana:** Okay good. Yeah, so — where were we. You'd asked what a normal
Tuesday looks like for my dispatch team, right?

**Marcus:** Right, just walk me through it.

**Dana:** Honestly it's a lot of tabs open at once. We've got maybe forty,
fifty loads moving on any given day between the three yards, and right now
the "system" is a shared spreadsheet plus a whiteboard plus a lot of
phone calls. My dispatchers basically want one screen when they sit down
in the morning that tells them: how many loads are actually on time right
now, how many are late, how many have some kind of exception flagged on
them — a driver called in, whatever — and then obviously a way to actually
click into any one load and see what's going on with it.

**Marcus:** Sure, that's a pretty standard ops dashboard shape. Give me
the exception example — what does "a driver called in" usually look like
in practice?

**Dana:** Okay so, say a driver is stuck at a scale house or there's a
mechanical thing, they call it in, and then somebody on my team has to
make a quick call — do we eat the delay, is it something we push back on
the customer for, whatever — and jot down what we decided. It's not a big
workflow, it's like a five-second "yes we're covering it" or "no, dispute
it" plus maybe one line of why. Nothing fancy, I just don't want that
living in somebody's email.

**Marcus:** Got it — so a lightweight accept/dispute action right there
with a note, not a whole separate approval system.

**Dana:** Right, exactly, don't overbuild it.

**Marcus:** Makes sense. Okay, and once a load is moving, what do you
want to see about its history — like, do you track checkpoints?

**Dana:** Yeah — picked up, in transit, crossed the border if it's a
cross-border load, arrived, delivered, that kind of thing, with who
updated it and when. Half the time right now that's a text thread I have
to scroll back through.

**Marcus:** That's a timeline view, we've got a clean pattern for that.
Sorry — go on, you were going to say something about the loads list too?

**Dana:** Yeah so on the main list, dispatchers need to search it — by
load number or customer name usually — and filter down to just, I don't
know, just the delayed ones, or just one customer. And if somebody
filters down to something with literally nothing in it right now, don't
just show a blank white screen, that confuses people, they think it's
broken.

**Marcus:** Yep, that's a solved problem on our end. What about creating
a new load — is that something dispatchers do in this tool, or does that
come from somewhere else?

**Dana:** No, they'd create it in here. It's a few things — where it's
coming from and going to, what's actually being hauled and what kind of
trailer, and then before they hit submit I want them to actually see a
summary, because right now people fat-finger a destination code and it
doesn't get caught until the truck's halfway there.

**Marcus:** Multi-step form with a review screen before submit — we do
that a lot, no problem. On the trailer type — is that just dry van, or
are there other types that change what you'd want to track?

**Dana:** We run reefer trailers too — refrigerated, for the produce and
the pharma accounts. Those are the ones that actually keep me up at
night, honestly, more than the on-time percentage stuff.

**Marcus:** How so?

**Dana:** So the trailer's got a temperature sensor, and it's fine 95% of
the time, but when it starts drifting toward the edge of the safe range —
say it's supposed to stay under 36 and it creeps up to 34, 35 — I want my
dispatcher to see that at a glance and go "okay, that one needs attention
before it becomes a rejected load." I don't need a whole historical graph
of it, I just want, like — is this one fine, is it getting close, is it
already a problem. Like a fuel gauge almost. I don't really care how you
show it, I just don't want it buried in a table of numbers where nobody
notices until the customer's already refusing the shipment.

**Marcus:** Okay, that's useful — that's more of an at-a-glance status
indicator than a chart, got it. We'll figure out the right way to show
that.

**Dana:** [Priya joins]

**Priya:** Hey, sorry I'm late, back to back this morning. What'd I miss?

**Dana:** Just walking through the dispatch dashboard stuff. I was about
to get into the notification piece — Priya, you had opinions on that.

**Priya:** Yeah, so — separate from the big dashboard — our dispatchers
each have their own preference for how they want to be pinged when
something needs attention. Some of them want a text message the second
something's flagged, some of them find that annoying and just want email,
some people want both. That's really just a settings screen, like, three
or four toggles, nothing complicated.

**Marcus:** Sure, that's straightforward — a small preferences area, on/off
switches basically.

**Dana:** And documents — every load's got paperwork attached to it, BOLs,
customs forms if it's cross-border, that kind of thing. Not every load
has documents attached yet though, especially brand new ones, so don't
make that look broken either.

**Marcus:** Noted, same pattern as the empty filter results — we'll handle
that consistently.

**Priya:** One more thing, and I already know you're going to tell me
this is a phase two conversation — Dana wants an actual live map with the
trucks moving on it, real GPS pings, the whole thing.

**Dana:** I do want that eventually! I know that's a bigger ask.

**Marcus:** That one's real, but it's a live data/integration piece —
actual GPS feeds, a mapping provider, that's outside what a prototype
like this is meant to do. I'd rather we show where that would live in
the nav so it's part of the story, and build the real thing as a
follow-on once we're past this stage, instead of faking something that
looks live but isn't.

**Dana:** That's fair, yeah, don't fake the truck-moving-on-a-map thing,
that always looks cheesy in a demo anyway when someone in the room asks
"wait, is that real?"

**Marcus:** Exactly. Okay, I think I've got enough to put a first pass
together — let me take all this and come back with something you can
click through.

**Dana:** Perfect, thank you — and sorry again for being ten minutes late
to my own call.
