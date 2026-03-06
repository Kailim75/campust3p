import * as React from "react";
import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";

interface AddressResult {
  label: string;
  street: string;
  postcode: string;
  city: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: { rue: string; code_postal: string; ville: string }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Commencez à taper une adresse…",
  className,
  disabled,
}: AddressAutocompleteProps) {
  const [results, setResults] = useState<AddressResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&type=housenumber&autocomplete=1`
      );
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      const items: AddressResult[] = (data.features || []).map((f: any) => ({
        label: f.properties.label,
        street: f.properties.name || "",
        postcode: f.properties.postcode || "",
        city: f.properties.city || "",
      }));

      setResults(items);
      setShowDropdown(items.length > 0);
      setHighlightedIndex(-1);
    } catch (err) {
      console.warn("[AddressAutocomplete] API error, fallback to manual input", err);
      setResults([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAddresses(val), 300);
  };

  const handleSelect = (result: AddressResult) => {
    onChange(result.street);
    onSelect({
      rue: result.street,
      code_postal: result.postcode,
      ville: result.city,
    });
    setShowDropdown(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="py-1 max-h-[200px] overflow-y-auto">
            {results.map((result, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors",
                  i === highlightedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
                onMouseEnter={() => setHighlightedIndex(i)}
                onClick={() => handleSelect(result)}
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{result.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showDropdown && results.length === 0 && !isLoading && value.length >= 3 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md p-3 text-center text-sm text-muted-foreground">
          Aucune adresse trouvée
        </div>
      )}
    </div>
  );
}
