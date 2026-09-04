import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { getCategoryLabel, getDisplayName, inferExpectedProfileFromPreferences, profilePreferenceOptions } from "../services/profile";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import type { DestinationCategory, User } from "../types";

type TouristProfileFormProps = {
  user: User;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
  locale?: Locale;
  onSave: (user: User) => void;
  onSkip?: () => void;
};

export function TouristProfileForm({
  user,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  locale = "en",
  onSave,
  onSkip,
}: TouristProfileFormProps) {
  const t = (key: TranslationKey) => translate(locale, key);
  const [name, setName] = useState(getDisplayName(user));
  const [preferences, setPreferences] = useState<DestinationCategory[]>(user.travelPreferences ?? []);
  const [tripPace, setTripPace] = useState<User["tripPace"]>(user.tripPace ?? "balanced");
  const [travelGroup, setTravelGroup] = useState<User["travelGroup"]>(user.travelGroup ?? "solo");
  const [accessibilityPreference, setAccessibilityPreference] = useState<User["accessibilityPreference"]>(user.accessibilityPreference ?? "none");
  const [emergencyContactName, setEmergencyContactName] = useState(user.emergencyContactName ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(user.emergencyContactPhone ?? "");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(user.emergencyContactRelation ?? "");

  const togglePreference = (preference: DestinationCategory) => {
    setPreferences((current) =>
      current.includes(preference) ? current.filter((candidate) => candidate !== preference) : [...current, preference]
    );
  };

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      ...user,
      name: name.trim() || user.name,
      expectedProfile: inferExpectedProfileFromPreferences(preferences),
      travelPreferences: preferences,
      tripPace,
      travelGroup,
      accessibilityPreference,
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      emergencyContactRelation: emergencyContactRelation.trim() || undefined,
      profileCompletedAt: new Date().toISOString(),
    });
  };

  return (
    <form className="profile-setup" onSubmit={saveProfile}>
      <section className="profile-setup-card">
        <div className="profile-setup-copy">
          <span>{t("tourist.profile.personalSetup")}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <div className="profile-form-grid">
          <label>
            {t("tourist.profile.preferredName")}
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("tourist.profile.preferredNamePlaceholder")} />
          </label>

          <fieldset>
            <legend>{t("tourist.profile.preferencesLegend")}</legend>
            <div className="preference-grid">
              {profilePreferenceOptions.map((option) => (
                <label className={preferences.includes(option.value) ? "preference-chip active" : "preference-chip"} key={option.value}>
                  <input type="checkbox" checked={preferences.includes(option.value)} onChange={() => togglePreference(option.value)} />
                  {getCategoryLabel(option.value, t)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field-pair">
            <label>
              {t("tourist.profile.travelPace")}
              <select value={tripPace} onChange={(event) => setTripPace(event.target.value as User["tripPace"])}>
                <option value="relaxed">{t("profile.option.relaxed")}</option>
                <option value="balanced">{t("profile.option.balanced")}</option>
                <option value="packed">{t("profile.option.packed")}</option>
              </select>
            </label>
            <label>
              {t("tourist.profile.travellingWith")}
              <select value={travelGroup} onChange={(event) => setTravelGroup(event.target.value as User["travelGroup"])}>
                <option value="solo">{t("profile.option.solo")}</option>
                <option value="couple">{t("profile.option.partner")}</option>
                <option value="family">{t("profile.option.family")}</option>
                <option value="friends">{t("profile.option.friends")}</option>
              </select>
            </label>
          </div>

          <label>
            {t("tourist.profile.walkingPreference")}
            <select value={accessibilityPreference} onChange={(event) => setAccessibilityPreference(event.target.value as User["accessibilityPreference"])}>
              <option value="none">{t("profile.option.noPreference")}</option>
              <option value="low-walking">{t("profile.option.lowWalking")}</option>
              <option value="wheelchair-friendly">{t("profile.option.wheelchair")}</option>
            </select>
          </label>

          <section className="profile-emergency-fields">
            <div>
              <span>{t("tourist.profile.emergencyContact")}</span>
              <p>{t("tourist.profile.emergencyDescription")}</p>
            </div>
            <div className="field-pair">
              <label>
                {t("tourist.profile.contactName")}
                <input value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} placeholder={t("tourist.profile.contactNamePlaceholder")} />
              </label>
              <label>
                {t("tourist.profile.contactPhone")}
                <input value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} placeholder={t("tourist.profile.contactPhonePlaceholder")} />
              </label>
            </div>
            <label>
              {t("tourist.profile.relationship")}
              <input value={emergencyContactRelation} onChange={(event) => setEmergencyContactRelation(event.target.value)} placeholder={t("tourist.profile.relationshipPlaceholder")} />
            </label>
          </section>
        </div>

        <div className="profile-actions">
          <button className="primary-action" type="submit">
            <Save size={18} />
            {primaryLabel}
          </button>
          {onSkip && (
            <button className="secondary-action" type="button" onClick={onSkip}>
              {secondaryLabel ?? t("tourist.profile.skipForNow")}
            </button>
          )}
        </div>
      </section>
    </form>
  );
}
