export interface FirstAidStep {
  title: string;
  scenario: string;
  steps: string[];
}

export const FIRST_AID_DATA: FirstAidStep[] = [
  {
    title: "Severe Bleeding",
    scenario: "Uncontrolled bleeding from a wound.",
    steps: [
      "Apply direct pressure to the wound with a clean cloth or bandage.",
      "Keep pressure applied until help arrives. Do not remove the cloth if it becomes soaked; add another on top.",
      "If bleeding is from an arm or leg and pressure doesn't stop it, consider a tourniquet if trained.",
      "Help the person lie down and keep them warm to prevent shock."
    ]
  },
  {
    title: "CPR (Adult)",
    scenario: "Person is unresponsive and not breathing.",
    steps: [
      "Check the scene for safety and the person for responsiveness.",
      "Call emergency services immediately.",
      "Place the heel of one hand in the center of the chest and the other on top.",
      "Push hard and fast (100-120 compressions per minute).",
      "Allow the chest to recoil completely between compressions.",
      "Continue until help arrives or an AED is available."
    ]
  },
  {
    title: "Choking",
    scenario: "Person cannot breathe, cough, or speak.",
    steps: [
      "Give 5 back blows between the shoulder blades with the heel of your hand.",
      "Give 5 abdominal thrusts (Heimlich maneuver).",
      "Alternate between 5 back blows and 5 abdominal thrusts until the object is forced out or the person becomes unresponsive."
    ]
  },
  {
    title: "Burns",
    scenario: "Skin contact with hot engine parts, fluids, or fire.",
    steps: [
      "Move the person away from the heat source.",
      "Cool the burn with cool (not cold) running water for at least 10 minutes.",
      "Remove jewelry or tight clothing before the area starts to swell.",
      "Cover the burn loosely with a sterile dressing or clean cloth. Do not apply ointments or butter."
    ]
  },
  {
    title: "Fractures / Sprains",
    scenario: "Broken bones or severe joint injury from impact.",
    steps: [
      "Keep the injured area still. Do not try to realign the bone.",
      "Apply a cold pack wrapped in a cloth to reduce swelling.",
      "If there is an open wound, cover it with a clean dressing.",
      "If you must move the person, splint the injury in the position you found it."
    ]
  },
  {
    title: "Shock",
    scenario: "Person has pale, cold, clammy skin; rapid pulse; or is confused.",
    steps: [
      "Lay the person down and elevate their legs slightly (about 12 inches).",
      "Keep the person warm and comfortable.",
      "Do not give them anything to eat or drink.",
      "Loosen restrictive clothing."
    ]
  }
];
