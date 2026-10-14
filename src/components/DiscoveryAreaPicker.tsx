import { useRef, type ComponentProps } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { discoveryAreas } from "../data/discoveryAreas";
import { discoveryText } from "../services/discoveryCopy";
import { DiscoveryLocationControl } from "./DiscoveryLocationControl";

export function DiscoveryAreaPicker(props: ComponentProps<typeof DiscoveryLocationControl>) {
  const details = useRef<HTMLDetailsElement>(null);
  const area = discoveryAreas.find((candidate) => candidate.id === props.user.discoveryAreaId);
  const label = props.user.discoveryLocationMode === "area" ? area?.name ?? discoveryText(props.locale, "choose") : discoveryText(props.locale, "current");
  return <details className="home-area-picker" ref={details}>
    <summary><MapPin size={20} aria-hidden="true" /><span>{discoveryText(props.locale, "location")}</span><strong>{label}</strong><ChevronDown size={18} aria-hidden="true" /></summary>
    <DiscoveryLocationControl {...props} onChange={(mode, areaId) => {
      props.onChange(mode, areaId);
      if ((mode === "current" || areaId) && details.current) details.current.open = false;
    }} />
  </details>;
}
