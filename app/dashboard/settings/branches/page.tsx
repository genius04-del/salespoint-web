"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { setAccessToken } from "@/lib/apiClient";
import { addBranch, enableGroup, getGroupMe, switchBranch, syncMenu, type BranchType, type GroupMe } from "@/lib/api/groups";
import { Field, Modal, ghostBtn, inputClass, primaryBtn } from "@/components/kitchen/Modal";
import { errMsg } from "@/components/kitchen/format";

export default function BranchesPage() {
  const { user } = useAuth();
  const [me, setMe] = useState<GroupMe | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMe(await getGroupMe());
      setError("");
    } catch (e) {
      setError(errMsg(e, "Could not load branches"));
    }
  }, []);

  useEffect(() => {
    (async () => { await load(); })();
  }, [load]);

  async function enable() {
    setBusy(true);
    try {
      await enableGroup();
      await load();
    } catch (e) {
      setError(errMsg(e, "Could not turn this on"));
    } finally {
      setBusy(false);
    }
  }

  async function sync(id: string, name: string) {
    setBusy(true);
    setNotice("");
    try {
      const { menu } = await syncMenu(id);
      setNotice(`${name} now has this branch's menu and prices: ${menu.created} added, ${menu.updated} updated.`);
    } catch (e) {
      setError(errMsg(e, "Could not copy the menu"));
    } finally {
      setBusy(false);
    }
  }

  async function goTo(id: string) {
    setBusy(true);
    try {
      setAccessToken((await switchBranch(id)).accessToken);
      window.location.href = "/dashboard";
    } catch (e) {
      setError(errMsg(e, "Could not switch"));
      setBusy(false);
    }
  }

  if (!me) return <p className="text-gray-500">{error || "Loading…"}</p>;

  return (
    <div className="max-w-2xl space-y-4">
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">{notice}</div>}

      {!me.isGroupAdmin && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-[#071A2F]">More than one branch?</h2>
          <p className="mt-1 text-sm text-gray-500">
            Turn this on to run several branches under one owner. Each branch keeps its own stock, tills, tables and day end.
            You switch between them and see every branch&apos;s takings in one report. A branch manager only ever sees their own branch.
          </p>
          {me.canEnable && user?.role === "OWNER" ? (
            <button onClick={enable} disabled={busy} className={`${primaryBtn} mt-3`}>{busy ? "Turning on…" : "Turn on branches"}</button>
          ) : (
            <p className="mt-3 text-sm text-gray-500">Only the owner can turn this on.</p>
          )}
        </div>
      )}

      {me.isGroupAdmin && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#071A2F]">{me.group?.name}</h2>
              <p className="text-sm text-gray-500">You are in: <b>{me.current?.name}</b></p>
            </div>
            <button onClick={() => setAdding(true)} className={primaryBtn}>Add branch</button>
          </div>
          <div className="divide-y divide-gray-100 rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {me.branches.map((b) => {
              const here = b.id === me.current?.id;
              return (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-gray-100 p-2 text-gray-500"><Building2 size={16} /></span>
                    <div>
                      <p className="font-medium text-[#071A2F]">{b.name}</p>
                      <p className="text-xs text-gray-500">{b.branchType === "PRODUCTION" ? "Production (central kitchen)" : "Shop / restaurant"}{here ? " · you are here" : ""}</p>
                    </div>
                  </div>
                  {!here && (
                    <div className="flex gap-2">
                      {b.branchType === "OUTLET" && (
                        <button disabled={busy} onClick={() => sync(b.id, b.name)} className={ghostBtn} title="Copy this branch's menu and prices to that branch">Copy my menu here</button>
                      )}
                      <button disabled={busy} onClick={() => goTo(b.id)} className={ghostBtn}>Switch</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">&ldquo;Copy my menu here&rdquo; sends the menu and prices of the branch you are in to the other branch. It never touches that branch&apos;s stock.</p>
        </>
      )}

      {adding && <AddBranchModal onClose={() => setAdding(false)} onDone={() => { setAdding(false); void load(); }} />}
    </div>
  );
}

function AddBranchModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<BranchType>("OUTLET");
  const [address, setAddress] = useState("");
  const [copy, setCopy] = useState(true);
  const [mName, setMName] = useState("");
  const [mEmail, setMEmail] = useState("");
  const [mPass, setMPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const wantsManager = mName || mEmail || mPass;
    if (wantsManager && (!mName || !mEmail || mPass.length < 8)) return setError("Fill the manager's name, email and a password of at least 8 characters, or leave all three empty.");
    setBusy(true);
    try {
      await addBranch({
        name: name.trim(),
        branchType: type,
        address: address.trim() || undefined,
        copyMenu: type === "OUTLET" && copy,
        manager: wantsManager ? { name: mName.trim(), email: mEmail.trim(), password: mPass } : undefined,
      });
      onDone();
    } catch (err) {
      setError(errMsg(err, "Could not add the branch"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add branch" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Branch name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Kwashieman" /></Field>
        <Field label="What kind of branch is it?">
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as BranchType)}>
            <option value="OUTLET">Shop / restaurant (sells)</option>
            <option value="PRODUCTION">Production only / central kitchen (does not sell)</option>
          </select>
        </Field>
        <Field label="Address (optional)"><input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        {type === "OUTLET" && (
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#FF6B00]" />
            Copy the menu and prices from the branch I am in now
          </label>
        )}
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Branch manager (optional)</p>
          <div className="space-y-2">
            <input className={inputClass} placeholder="Name" value={mName} onChange={(e) => setMName(e.target.value)} />
            <input className={inputClass} type="email" placeholder="Email (they log in with this)" value={mEmail} onChange={(e) => setMEmail(e.target.value)} />
            <input className={inputClass} type="password" placeholder="Password (at least 8 characters)" value={mPass} onChange={(e) => setMPass(e.target.value)} />
          </div>
          <p className="mt-2 text-xs text-gray-500">They will only see this branch.</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
          <button disabled={busy} className={primaryBtn}>{busy ? "Adding…" : "Add branch"}</button>
        </div>
      </form>
    </Modal>
  );
}
