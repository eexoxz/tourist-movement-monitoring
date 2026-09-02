import { describe, expect, it } from "vitest";
import { isLocale, localeOptions, translate } from "./i18n";

describe("i18n", () => {
  it("recognizes supported locales", () => {
    expect(localeOptions.map((option) => option.value)).toEqual(["en", "ms", "zh", "ja", "ko", "pt", "ta", "es", "fr"]);
    expect(localeOptions.every((option) => isLocale(option.value))).toBe(true);
    expect(isLocale("de")).toBe(false);
  });

  it("translates core navigation labels", () => {
    expect(translate("en", "nav.home")).toBe("Home");
    expect(translate("ms", "nav.home")).toBe("Utama");
    expect(translate("zh", "nav.home")).toBe("首页");
    expect(translate("ja", "nav.home")).toBe("ホーム");
    expect(translate("ko", "nav.home")).toBe("홈");
    expect(translate("pt", "nav.home")).toBe("Início");
    expect(translate("ta", "nav.home")).toBe("முகப்பு");
    expect(translate("es", "nav.home")).toBe("Inicio");
    expect(translate("fr", "nav.home")).toBe("Accueil");
  });

  it("translates key tourist workflow actions", () => {
    expect(translate("ms", "tourist.home.startTrip")).toBe("Mulakan Perjalanan");
    expect(translate("zh", "tourist.checkin.checkIn")).toBe("签到");
    expect(translate("ja", "tourist.safety.sos")).toBe("SOS リクエスト送信");
    expect(translate("ko", "tourist.recommendations.pageTitle")).toBe("장소 탐색");
    expect(translate("pt", "tourist.events.pageTitle")).toBe("Calendário de Eventos");
    expect(translate("ta", "tourist.profile.notSetYet")).toBe("இன்னும் அமைக்கப்படவில்லை");
    expect(translate("es", "tourist.safety.submitIncident")).toBe("Enviar reporte de incidente");
    expect(translate("fr", "tourist.home.stopTrip")).toBe("Arrêter le voyage");
  });

  it("covers the tourist pages added after login", () => {
    expect(translate("en", "tourist.trips.pageTitle")).toBe("Trip Diary");
    expect(translate("en", "tourist.places.heroTitle")).toBe("Find places that match your trip right now.");
    expect(translate("en", "tourist.events.calendarTitle")).toBe("Malaysia Festival Calendar");
    expect(translate("en", "tourist.completed.viewRecommendations")).toBe("View Recommendations");
    expect(translate("en", "tourist.recommendations.viewDestination")).toBe("View Destination");
    expect(translate("en", "tourist.profile.preferredName")).toBe("Preferred name");
    expect(translate("en", "tourist.profile.walkingPreference")).toBe("Walking preference");
    expect(translate("en", "tourist.places.mode.quieter")).toBe("Quieter picks");
  });
});
