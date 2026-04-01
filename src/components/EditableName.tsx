"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";

export default function EditableName({ initialName }: { initialName: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      
      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="flex items-center space-x-3 mb-2">
        <h1 className="text-3xl font-bold">Welcome,</h1>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-gray-600 bg-gray-700 px-3 py-1 text-2xl font-bold text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={isLoading}
          autoFocus
        />
        <button 
          type="submit" 
          disabled={isLoading || !name.trim()} 
          className="rounded-full bg-green-600 p-1.5 text-white hover:bg-green-500 disabled:opacity-50"
        >
          <Check className="h-5 w-5" />
        </button>
        <button 
          type="button"
          onClick={() => { setIsEditing(false); setName(initialName); }} 
          disabled={isLoading} 
          className="rounded-full bg-red-600 p-1.5 text-white hover:bg-red-500 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
      </form>
    );
  }

  return (
    <div className="group flex items-center space-x-3 mb-2">
      <h1 className="text-3xl font-bold">Welcome, {initialName}</h1>
      <button 
        onClick={() => setIsEditing(true)} 
        className="rounded-md p-1.5 text-gray-500 opacity-0 transition hover:bg-gray-700 hover:text-white group-hover:opacity-100"
        aria-label="Edit name"
      >
        <Pencil className="h-5 w-5" />
      </button>
    </div>
  );
}