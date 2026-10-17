import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  APP_TIMEZONE,
  computeOpenNow,
  getDutyContext,
  getOrdinaryStatus,
  nowInAppZone,
} from "../temporal-engine";
import type {
  DutyShiftInput,
  HolidayInput,
  OpeningExceptionInput,
  OpeningHourRuleInput,
  PharmacyWithSchedule,
} from "../domain-types";

const dt = (iso: string) => DateTime.fromISO(iso, { zone: APP_TIMEZONE });

describe("getDutyContext — límites horarios (RF002, RN002, RN003)", () => {
  it("09:29 pertenece a la guardia nocturna del día anterior", () => {
    const ctx = getDutyContext(dt("2026-10-13T09:29:00"));
    expect(ctx).toEqual({ serviceDate: "2026-10-12", shiftType: "night" });
  });

  it("09:30 comienza la guardia diurna del día actual", () => {
    const ctx = getDutyContext(dt("2026-10-13T09:30:00"));
    expect(ctx).toEqual({ serviceDate: "2026-10-13", shiftType: "day" });
  });

  it("21:59 continúa la guardia diurna", () => {
    const ctx = getDutyContext(dt("2026-10-13T21:59:00"));
    expect(ctx).toEqual({ serviceDate: "2026-10-13", shiftType: "day" });
  });

  it("22:00 comienza la guardia nocturna del día actual", () => {
    const ctx = getDutyContext(dt("2026-10-13T22:00:00"));
    expect(ctx).toEqual({ serviceDate: "2026-10-13", shiftType: "night" });
  });

  it("00:00 mantiene la guardia nocturna de la fecha anterior", () => {
    const ctx = getDutyContext(dt("2026-10-13T00:00:00"));
    expect(ctx).toEqual({ serviceDate: "2026-10-12", shiftType: "night" });
  });

  it("respeta el cambio de hora de verano a invierno (DST)", () => {
    // España cambia de verano a invierno el último domingo de octubre.
    // A las 03:00 CEST el reloj retrocede a las 02:00 CET.
    const beforeChange = dt("2026-10-25T09:29:00");
    const afterChange = dt("2026-10-25T09:30:00");
    expect(beforeChange.offset).not.toBe(0);
    expect(getDutyContext(beforeChange).shiftType).toBe("night");
    expect(getDutyContext(afterChange).shiftType).toBe("day");
  });
});

describe("getOrdinaryStatus — horario ordinario, festivos y excepciones", () => {
  const mondayRule: OpeningHourRuleInput = {
    weekday: 1,
    opensAt: "09:00",
    closesAt: "14:00",
    validFrom: "2026-01-01",
    validTo: null,
    season: "all_year",
  };
  const mondayAfternoonRule: OpeningHourRuleInput = {
    weekday: 1,
    opensAt: "17:00",
    closesAt: "20:30",
    validFrom: "2026-01-01",
    validTo: null,
    season: "all_year",
  };

  it("está abierta dentro del tramo de mañana (jornada partida)", () => {
    const status = getOrdinaryStatus(
      dt("2026-10-12T10:00:00"), // lunes
      dt("2026-10-12T10:00:00"),
      [mondayRule, mondayAfternoonRule],
      [],
      []
    );
    expect(status.open).toBe(true);
    expect(status.closesAt).toBe("14:00");
  });

  it("está cerrada entre los dos tramos de una jornada partida", () => {
    const status = getOrdinaryStatus(
      dt("2026-10-12T15:00:00"),
      dt("2026-10-12T15:00:00"),
      [mondayRule, mondayAfternoonRule],
      [],
      []
    );
    expect(status.open).toBe(false);
  });

  it("está abierta en el segundo tramo de la tarde", () => {
    const status = getOrdinaryStatus(
      dt("2026-10-12T18:00:00"),
      dt("2026-10-12T18:00:00"),
      [mondayRule, mondayAfternoonRule],
      [],
      []
    );
    expect(status.open).toBe(true);
    expect(status.closesAt).toBe("20:30");
  });

  it("un festivo sin excepción confirmada nunca se muestra como abierta (RN005)", () => {
    const holidays: HolidayInput[] = [
      { date: "2026-10-12", scope: "national" },
    ];
    const status = getOrdinaryStatus(
      dt("2026-10-12T10:00:00"),
      dt("2026-10-12T10:00:00"),
      [mondayRule, mondayAfternoonRule],
      [],
      holidays
    );
    expect(status.open).toBe(false);
    expect(status.reason).toBe("holiday_unconfirmed");
  });

  it("una apertura excepcional en festivo sí permite mostrarla abierta", () => {
    const holidays: HolidayInput[] = [
      { date: "2026-10-12", scope: "national" },
    ];
    const exceptions: OpeningExceptionInput[] = [
      {
        date: "2026-10-12",
        type: "special_hours",
        opensAt: "10:00",
        closesAt: "13:00",
      },
    ];
    const status = getOrdinaryStatus(
      dt("2026-10-12T11:00:00"),
      dt("2026-10-12T11:00:00"),
      [mondayRule],
      exceptions,
      holidays
    );
    expect(status.open).toBe(true);
    expect(status.reason).toBe("exception_special_hours");
  });

  it("un cierre excepcional prevalece sobre el horario ordinario", () => {
    const exceptions: OpeningExceptionInput[] = [
      { date: "2026-10-12", type: "closed" },
    ];
    const status = getOrdinaryStatus(
      dt("2026-10-12T10:00:00"),
      dt("2026-10-12T10:00:00"),
      [mondayRule],
      exceptions,
      []
    );
    expect(status.open).toBe(false);
    expect(status.reason).toBe("exception_closed");
  });

  it("sin reglas para ese día de la semana, el estado es no_rule (no abierta)", () => {
    const status = getOrdinaryStatus(
      dt("2026-10-11T10:00:00"), // domingo, sin reglas definidas
      dt("2026-10-11T10:00:00"),
      [mondayRule],
      [],
      []
    );
    expect(status.open).toBe(false);
    expect(status.reason).toBe("no_rule");
  });
});

describe("computeOpenNow — combinación de guardia y horario ordinario (RF001)", () => {
  const pharmacyA: PharmacyWithSchedule = {
    id: "a",
    displayName: "Farmacia Cervantes",
    address: "Cervantes, 17",
    municipality: "Mairena del Alcor",
    phone: "955942079",
    latitude: null,
    longitude: null,
    verificationStatus: "confirmed",
    active: true,
    openingHourRules: [
      {
        weekday: 1,
        opensAt: "09:00",
        closesAt: "21:00",
        validFrom: "2026-01-01",
        validTo: null,
        season: "all_year",
      },
    ],
    openingExceptions: [],
  };
  const pharmacyB: PharmacyWithSchedule = {
    id: "b",
    displayName: "Farmacia Ancha",
    address: "Ancha, 59",
    municipality: "Mairena del Alcor",
    phone: "955943137",
    latitude: null,
    longitude: null,
    verificationStatus: "pending", // horario no confirmado
    active: true,
    openingHourRules: [
      {
        weekday: 1,
        opensAt: "09:00",
        closesAt: "21:00",
        validFrom: "2026-01-01",
        validTo: null,
        season: "all_year",
      },
    ],
    openingExceptions: [],
  };

  const dutyShifts: DutyShiftInput[] = [
    { pharmacyId: "a", shiftType: "day", serviceDate: "2026-10-12" },
  ];

  it("una farmacia de guardia y abierta por horario recibe ambas etiquetas", () => {
    const { cards, dutyContext } = computeOpenNow(
      dt("2026-10-12T10:00:00"), // lunes
      [pharmacyA, pharmacyB],
      [],
      dutyShifts
    );
    expect(dutyContext).toEqual({ serviceDate: "2026-10-12", shiftType: "day" });
    expect(cards).toHaveLength(1); // Ancha no tiene horario confirmado ni guardia
    expect(cards[0].pharmacyId).toBe("a");
    expect(cards[0].reasons.sort()).toEqual(["duty", "ordinary"]);
  });

  it("un horario pendiente de confirmar nunca aparece como abierta (RN005)", () => {
    const { cards } = computeOpenNow(
      dt("2026-10-12T10:00:00"),
      [pharmacyB],
      [],
      []
    );
    expect(cards).toHaveLength(0);
  });

  it("una guardia en El Viso del Alcor se presenta igualmente (RN006)", () => {
    const outOfTownShift: DutyShiftInput[] = [
      {
        pharmacyId: null,
        shiftType: "day",
        serviceDate: "2026-10-12",
        rawName: "Farmacia López Benítez",
        rawMunicipality: "El Viso del Alcor",
      },
    ];
    const { cards } = computeOpenNow(
      dt("2026-10-12T10:00:00"),
      [],
      [],
      outOfTownShift
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].outOfTown).toBe(true);
    expect(cards[0].municipality).toBe("El Viso del Alcor");
  });
});

describe("nowInAppZone", () => {
  it("usa Europe/Madrid como zona por defecto", () => {
    const now = nowInAppZone("2026-10-12T10:00:00");
    expect(now.zoneName).toBe(APP_TIMEZONE);
  });
});
