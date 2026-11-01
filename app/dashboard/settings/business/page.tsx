"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getBusiness, updateBusiness } from "@/lib/api/business";
import { ApiError } from "@/lib/apiClient";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 disabled:bg-gray-50 disabled:text-gray-500";

export default function BusinessSettingsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [businessType, setBusinessType] = useState("");
  const [logoBroken, setLogoBroken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { business } = await getBusiness();
        setName(business.name);
        setPhone(business.phone ?? "");
        setAddress(business.address ?? "");
        setLogoUrl(business.logoUrl ?? "");
        setCurrency(business.currency);
        setBusinessType(business.businessType);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load business details.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const { business } = await updateBusiness({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        // Backend validates logoUrl as a URL, so only send it when filled.
        ...(logoUrl.trim() ? { logoUrl: logoUrl.trim() } : {}),
        currency: currency.trim().toUpperCase(),
        businessType: businessType.trim(),
      });
      setName(business.name);
      setSuccess("Business details saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div>
        <h2 className="text-lg font-bold text-primary-navy">Business details</h2>
        {!isOwner && <p className="mt-1 text-sm text-gray-600">Only the business Owner can edit these.</p>}
      </div>

      <div>
        <label htmlFor="bname" className="mb-1 block text-sm font-medium text-primary-navy">Business name</label>
        <input id="bname" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} disabled={!isOwner} required minLength={2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bphone" className="mb-1 block text-sm font-medium text-primary-navy">Phone</label>
          <input id="bphone" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isOwner} />
        </div>
        <div>
          <label htmlFor="btype" className="mb-1 block text-sm font-medium text-primary-navy">Business type</label>
          <input id="btype" className={inputClass} value={businessType} onChange={(e) => setBusinessType(e.target.value)} disabled={!isOwner} required minLength={2} placeholder="e.g. Restaurant" />
        </div>
      </div>
      <div>
        <label htmlFor="baddr" className="mb-1 block text-sm font-medium text-primary-navy">Address</label>
        <textarea id="baddr" rows={2} className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} disabled={!isOwner} />
      </div>
      <div>
        <label htmlFor="bcur" className="mb-1 block text-sm font-medium text-primary-navy">Currency code</label>
        <input id="bcur" className={`${inputClass} sm:w-32`} value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!isOwner} required minLength={3} maxLength={3} />
      </div>
      <div>
        <label htmlFor="blogo" className="mb-1 block text-sm font-medium text-primary-navy">Logo URL</label>
        <input
          id="blogo"
          type="url"
          className={inputClass}
          value={logoUrl}
          onChange={(e) => {
            setLogoUrl(e.target.value);
            setLogoBroken(false);
          }}
          disabled={!isOwner}
          placeholder="https://…/logo.png"
        />
        <p className="mt-1 text-xs text-gray-500">Paste a link to your logo image. Direct uploads are not available yet.</p>
        {logoUrl && !logoBroken && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo preview" onError={() => setLogoBroken(true)} className="mt-3 h-16 w-16 rounded-lg object-contain ring-1 ring-black/10" />
        )}
        {logoUrl && logoBroken && <p className="mt-2 text-xs text-danger">That link could not be loaded as an image.</p>}
      </div>

      {error && (
        <p className="flex items-start gap-2 text-sm text-danger">
          <CircleAlert size={16} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      {success && (
        <p className="flex items-start gap-2 text-sm text-success">
          <CircleCheck size={16} className="mt-0.5 shrink-0" /> {success}
        </p>
      )}
      {isOwner && (
        <button type="submit" disabled={isSaving} className="rounded-lg bg-brand-orange px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {isSaving ? "Saving…" : "Save changes"}
        </button>
      )}
    </form>
  );
}
