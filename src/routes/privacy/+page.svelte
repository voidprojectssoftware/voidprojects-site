<script lang="ts">
	import { LegalPage } from '$lib/components/legal-page/index.js';
	import { CONTACT_EMAIL } from '$lib/content/websites.js';
	import { PAGES } from '$lib/seo/site.js';

	const SECTIONS = [
		{ id: 'who-this-covers', title: '1. Who this covers' },
		{ id: 'what-we-collect', title: '2. What we collect and why' },
		{ id: 'who-we-share-it-with', title: '3. Who we share it with' },
		{ id: 'how-long-we-keep-it', title: '4. How long we keep it' },
		{ id: 'your-choices-and-rights', title: '5. Your choices and rights' },
		{ id: 'customer-sites', title: "6. Data on our customers' sites" },
		{ id: 'security', title: '7. Security' },
		{ id: 'children', title: '8. Children' },
		{ id: 'where-processed', title: '9. Where your information is processed' },
		{ id: 'changes', title: '10. Changes to this policy' },
		{ id: 'contact', title: '11. Contact' }
	];
	const heading = (id: string) => SECTIONS.find((s) => s.id === id)!.title;

	const PROVIDERS = [
		{
			name: 'Microsoft Azure (Static Web Apps, Communication Services)',
			role: 'Hosts our site and customer sites; sends form messages to us by email'
		},
		{ name: 'Microsoft 365', role: `Our email (${CONTACT_EMAIL})` },
		{
			name: 'Cloudflare',
			role: "Runs our domain's DNS; registers customers' domains; hosts prospect preview sites"
		},
		{
			name: 'Stripe (Checkout, Billing, Customer Portal, Tax)',
			role: 'Takes payments, manages subscriptions, calculates sales tax'
		},
		{
			name: 'Cloudflare Web Analytics',
			role: 'Performance and aggregate visit counts, without cookies, if we turn it on'
		},
		{
			name: 'GitHub',
			role: 'Stores our site code, offer pages, and preview sites in private, access-restricted repositories'
		},
		{
			name: 'BigDataCloud',
			role: 'Looks up a city name, only if you use the sky location feature'
		},
		{
			name: 'Google (YouTube)',
			role: 'Plays embedded videos, only after you press play'
		}
	];
</script>

{#snippet mail()}<a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>{/snippet}

<LegalPage
	meta={PAGES.privacy}
	title="Privacy Policy"
	dateLabel="Effective date"
	updated="2026-11-07"
	sections={SECTIONS}
>
	<p>
		This policy explains what personal information Void Projects LLC, doing business as Void
		Projects ("we", "us"), collects through voidprojects.ai and our services, what we do with it,
		and the choices you have. We are a small studio in Memphis, Tennessee. We collect as little as
		we can, we don't sell it, and we don't use advertising trackers. Questions go to {@render mail()}.
	</p>

	<h2 id="who-this-covers">{heading('who-this-covers')}</h2>
	<ul>
		<li><strong>Visitors</strong> to voidprojects.ai.</li>
		<li>
			<strong>Prospects</strong>: businesses and causes we have prepared a private offer page for.
		</li>
		<li>
			<strong>Customers</strong>: people and organizations who subscribe to a website from us,
			including free sites for causes.
		</li>
		<li>
			<strong>Visitors to our customers' sites.</strong> For data those sites collect (such as
			contact-form messages), we act on our customer's behalf. See
			<a href="#customer-sites">section 6</a>.
		</li>
	</ul>

	<h2 id="what-we-collect">{heading('what-we-collect')}</h2>
	<p>
		<strong>When you use our contact form:</strong> your name, email address, the kind of request, and
		your message. We use it to reply to you. The form sends it to us by email.
	</p>
	<p>
		<strong>When you visit voidprojects.ai or a site we host:</strong> our hosting provider receives the
		technical details every website receives, such as your IP address, browser type, and the page requested,
		to deliver the page and keep it secure.
	</p>
	<p>
		<strong>Monitoring and usage statistics:</strong> to keep our site and our customers' sites running,
		we use our own uptime checks to check that sites are up and loading quickly. We may also use Cloudflare
		Web Analytics to count visits in aggregate (for example, which pages are popular and which links bring
		people in). It does not use cookies, and we would use it only to look after the sites, not to build
		profiles of individual visitors. We don't use advertising trackers or tracking pixels, and we don't
		sell this data.
	</p>
	<p>
		<strong>Sky location (optional):</strong> the animated sky on our pages can be redrawn for where you
		are. Nothing happens unless you click the sky label and allow your browser to share a low-accuracy
		location. Your coordinates are then sent to BigDataCloud, a reverse-geocoding service, to look up
		your city name. We don't store your location or send it to our servers.
	</p>
	<p>
		<strong>Embedded videos:</strong> some blog posts include YouTube videos. Until you press play, you
		see an image hosted by us and nothing is requested from YouTube. When you press play, the video loads
		from YouTube's privacy-enhanced mode (youtube-nocookie.com), and Google may then collect information
		under its own privacy policy.
	</p>
	<p>
		<strong>If we prepare an offer for you (prospects):</strong> your business's public information
		(such as its name, address, phone number, hours, and existing website), our review of your
		current website, and a preview site we built. These sit on a private, unlisted page that we
		share only with you. We use them to show you what we could build. If you don't sign up, we
		remove them 90 days after we send you the offer, or sooner if you ask (see
		<a href="#how-long-we-keep-it">section 4</a> for what "remove" means).
	</p>
	<p>
		<strong>When you sign up and pay:</strong> through Stripe Checkout we collect your name, email, phone
		number, billing address, business name, and the best time to reach you. Stripe handles your card details;
		we never see or store your full card number. Stripe Tax uses your billing address to work out sales
		tax. You manage billing in the Stripe Customer Portal. After signing up you can send us questions
		through a short form, which reaches us by email.
	</p>
	<p>
		<strong>When you are a customer:</strong> the content you give us for your site (text, photos, logos),
		and our emails and messages with you. We use it to build, host, and look after your site, to register
		your domain in your name, to bill you, and to contact you about your service.
	</p>
	<p>
		We don't collect sensitive information such as health data, and we don't make automated
		decisions about you.
	</p>

	<h2 id="who-we-share-it-with">{heading('who-we-share-it-with')}</h2>
	<p>
		We share personal information only with the service providers that help us run the business, and
		only what they need:
	</p>
	<table>
		<thead>
			<tr><th scope="col">Provider</th><th scope="col">What it does for us</th></tr>
		</thead>
		<tbody>
			{#each PROVIDERS as provider (provider.name)}
				<tr><td>{provider.name}</td><td>{provider.role}</td></tr>
			{/each}
		</tbody>
	</table>
	<p>
		Stripe, Google, Microsoft, and Cloudflare also use some information for their own purposes (such
		as fraud prevention and security) under their own privacy policies. When we register a domain
		for you, the registration details the domain system requires (such as your name and contact
		details) go to Cloudflare as registrar and to the registry for that domain.
	</p>
	<p>
		We may also share information if the law requires it, to protect our rights or someone's safety,
		or as part of selling or merging the business (we would tell customers first).
	</p>
	<p>
		<strong
			>We do not sell your personal information, and we do not share it for advertising.</strong
		> No third parties track you across other sites through ours.
	</p>

	<h2 id="how-long-we-keep-it">{heading('how-long-we-keep-it')}</h2>
	<ul>
		<li>
			<strong>Contact-form messages that don't lead to work:</strong> deleted after 12 months.
		</li>
		<li>
			<strong>Prospect offer pages, reviews, and previews:</strong> removed 90 days after we send the
			offer, or sooner if you ask.
		</li>
		<li>
			<strong>Customer account details and content:</strong> for as long as you subscribe. When your service
			ends, we keep your site files and content for up to one year so you can ask for them, then delete
			them.
		</li>
		<li>
			<strong>Your visitors' personal data (such as form messages):</strong> when your service ends, we
			email it to you as an export at your billing email address and delete it 30 days later.
		</li>
		<li>
			<strong>Billing and tax records:</strong> 7 years. Stripe also keeps its own records under its policy.
		</li>
		<li>
			<strong>Hosting and monitoring logs:</strong> a short period, set by those providers.
		</li>
	</ul>
	<p>
		<strong>What "remove" and "delete" mean here.</strong> We keep our sites, offer pages, and preview
		sites in version-controlled code repositories, which keep a history of past versions. Removing something
		takes it off the live site and out of our working files. Copies can remain in that version history,
		which only we can access, and we don't use them. All code and sites are also backed up and versioned,
		so copies can remain in those backups too. Our providers (Azure, Microsoft 365, Stripe, and Cloudflare)
		may keep their own copies for a time under their own policies.
	</p>

	<h2 id="your-choices-and-rights">{heading('your-choices-and-rights')}</h2>
	<p>Wherever you live, you can ask us to:</p>
	<ul>
		<li>tell you what personal information we hold about you and give you a copy;</li>
		<li>correct it;</li>
		<li>delete it (unless we need to keep it, for example tax records or to settle a dispute);</li>
		<li>stop contacting you.</li>
	</ul>
	<p>
		Email {@render mail()}. We may ask you to confirm who you are. We reply within 30 days. We won't
		treat you differently for asking.
	</p>
	<p>
		You can also say no to the sky location prompt, choose not to play videos, and block cookies in
		your browser without losing anything on our site.
	</p>
	<p>
		<strong>Do Not Track and Global Privacy Control:</strong> because we don't track you across sites
		or sell your data, these browser signals don't change anything here. We already behave as if they
		are on.
	</p>

	<h2 id="customer-sites">{heading('customer-sites')}</h2>
	<p>
		When a customer's site collects information from its visitors, such as contact-form messages,
		our customer decides what is collected and why, and we handle it on their behalf. We use it only
		to run that site and deliver it to our customer, keep it secure, and don't use it for anything
		of our own. If you visited one of our customers' sites, contact that business about your
		information. If you contact us instead, we will pass your request on.
	</p>
	<p>
		Like any host, we also see technical details (such as IP addresses) when people visit customer
		sites, and we monitor those sites as described in <a href="#what-we-collect">section 2</a>. We
		use this only to deliver, protect, and look after the sites.
	</p>
	<p>Customers who need a data processing agreement can ask us for one.</p>
	<p>
		While a customer's service is active, messages their visitors send through the site are emailed
		straight to the customer and not stored on our systems, unless the customer asks us to set it up
		differently.
	</p>
	<p>
		The agreement between us and our customers is our <a href={PAGES.terms.path}>Terms of Service</a
		>.
	</p>

	<h2 id="security">{heading('security')}</h2>
	<p>
		We use reputable providers, encrypted connections (HTTPS), private repositories, and limited
		access to the accounts that hold your information. No system is perfectly secure. If a breach
		affects your personal information, we will tell you as the law requires.
	</p>

	<h2 id="children">{heading('children')}</h2>
	<p>
		Our site and services are not directed at children under 13, and we don't knowingly collect
		their information. If you believe a child has sent us information, contact us and we will delete
		it.
	</p>

	<h2 id="where-processed">{heading('where-processed')}</h2>
	<p>
		We are based in the United States and our providers store data mainly in the United States. If
		you contact us from elsewhere, your information will be handled in the United States.
	</p>

	<h2 id="changes">{heading('changes')}</h2>
	<p>
		We will post any update here with a new effective date. If a change matters, we will email
		customers at least 30 days before it takes effect.
	</p>

	<h2 id="contact">{heading('contact')}</h2>
	<address>
		Void Projects LLC<br />
		501 Union St Ste 545 PMB 834400<br />
		Nashville, Tennessee 37219-1876, US<br />
		{@render mail()}
	</address>
</LegalPage>
