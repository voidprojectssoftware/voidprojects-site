// Icons for CAUSES.kinds, kept out of websites.ts so the API bundle (which imports
// that file for CONTACT_KINDS) never pulls in Svelte components.
import type { Component } from 'svelte';
import { Flower2, HeartPulse, Megaphone, PawPrint, Ribbon, Users } from '@lucide/svelte';

export const CAUSE_ICONS: Record<string, Component> = {
	Memorials: Flower2,
	'Medical and cancer support': HeartPulse,
	Fundraisers: Ribbon,
	'Community groups': Users,
	'Animal rescue': PawPrint,
	'Awareness campaigns': Megaphone
};
