<script lang="ts">
	import { LegalPage } from '$lib/components/legal-page/index.js';
	import { CONTACT_EMAIL } from '$lib/content/websites.js';
	import { PAGES } from '$lib/seo/site.js';

	const SECTIONS = [
		{ id: 'what-you-get', title: '1. What you get' },
		{ id: 'adding-features', title: '2. Adding features' },
		{ id: 'previews', title: '3. Previews' },
		{ id: 'billing', title: '4. Billing' },
		{ id: 'cancelling-and-refunds', title: '5. Cancelling and refunds' },
		{ id: 'late-or-failed-payments', title: '6. Late or failed payments' },
		{ id: 'who-owns-what', title: '7. Who owns what' },
		{ id: 'after-you-leave', title: '8. After you leave' },
		{ id: 'your-responsibilities', title: '9. Your responsibilities' },
		{ id: 'acceptable-use', title: '10. Acceptable use' },
		{ id: 'availability-and-warranties', title: '11. Availability and warranties' },
		{ id: 'limits-on-liability', title: '12. Limits on liability' },
		{ id: 'changes', title: '13. Changes to prices and these terms' },
		{ id: 'free-sites-for-causes', title: '14. Free sites for causes' },
		{ id: 'custom-software', title: '15. Custom software' },
		{ id: 'privacy', title: '16. Privacy' },
		{ id: 'legal-bits', title: '17. Legal bits' },
		{ id: 'contact', title: '18. Contact' }
	];
	const heading = (id: string) => SECTIONS.find((s) => s.id === id)!.title;
</script>

{#snippet mail()}<a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>{/snippet}

<LegalPage meta={PAGES.terms} title="Terms of Service" updated="2026-11-07" sections={SECTIONS}>
	<p>
		These terms are the agreement between you (the business, cause, or person signing up) and Void
		Projects LLC, doing business as Void Projects ("we", "us"). By subscribing, you agree to them.
		We have tried to keep them short and in plain English. If something is unclear, ask us at {@render mail()}.
	</p>

	<h2 id="what-you-get">{heading('what-you-get')}</h2>
	<p>
		We design, build, host, and look after a website for you, for a monthly (or annual) fee. There
		is no build fee and no minimum term.
	</p>
	<p>Your plan includes:</p>
	<ul>
		<li>The site we agreed on, built by our engineers.</li>
		<li>Hosting, security updates, and routine upkeep for as long as you subscribe.</li>
		<li>
			Small changes (text, photos, hours, prices, and similar) at no extra charge, within reason.
		</li>
	</ul>
	<p>
		What is included in your plan, and its price, is shown on your sign-up page or quote. If that
		page and these terms disagree, the sign-up page or quote wins for that point.
	</p>

	<h2 id="adding-features">{heading('adding-features')}</h2>
	<p>
		Bigger additions, such as new features (for example, letting your visitors send you messages),
		usually need more ongoing hosting and services to run. Instead of charging you for our time to
		build them, we add an amount to your plan to cover running them, and tell you the new plan price
		before we start.
	</p>
	<ul>
		<li><strong>Monthly plans:</strong> the new price applies from your next bill.</li>
		<li>
			<strong>Annual plans:</strong> you can pay the prorated difference for the rest of your current
			year, or pay the added amount monthly until your annual renewal.
		</li>
		<li>
			<strong>One-off option:</strong> if you would rather pay for a piece of work once instead of changing
			your plan, ask and we will quote that.
		</li>
	</ul>

	<h2 id="previews">{heading('previews')}</h2>
	<p>
		Before you sign up we may build a preview of your site and show it to you. The preview is our
		work. Showing it to you does not give you any rights to it until you subscribe. If you don't
		subscribe, we may take it down or reuse the design for others (without your content).
	</p>

	<h2 id="billing">{heading('billing')}</h2>
	<ul>
		<li>
			You pay in advance, monthly or annually, through Stripe. Your subscription renews
			automatically until you cancel.
		</li>
		<li>
			Annual plans are offered at a discount and renew for another year unless you cancel before the
			renewal date. We email you a reminder about 14 days before an annual renewal.
		</li>
		<li>Sales tax is added where required and calculated by Stripe Tax.</li>
		<li>
			You can update your card, see invoices, and cancel any time in the billing portal we link you
			to.
		</li>
		<li>Prices are set per customer. Your price is the one on your sign-up page or invoice.</li>
	</ul>

	<h2 id="cancelling-and-refunds">{heading('cancelling-and-refunds')}</h2>
	<ul>
		<li>
			You can cancel any time from the billing portal or by emailing us. There is no cancellation
			fee.
		</li>
		<li>
			<strong>Monthly plans:</strong> cancelling stops your next charge. Payments already made are not
			refunded, and your site stays up until the end of the month you have paid for.
		</li>
		<li>
			<strong>Annual plans:</strong> if you cancel within 15 days of your first annual payment, we refund
			it in full, minus the domain's registration fee. This applies even if the domain was included in
			your plan price: we still deduct the registrar's price for it, and you keep the domain. After that,
			annual payments are not refunded, but your site stays up for the rest of the year you have paid
			for.
		</li>
		<li>
			If we end your service for our own reasons (not because you broke these terms), we refund the
			time you have paid for but not used.
		</li>
	</ul>

	<h2 id="late-or-failed-payments">{heading('late-or-failed-payments')}</h2>
	<p>
		If a payment fails, Stripe will retry it and we will let you know. If it still hasn't been paid
		14 days after the due date, we may take the site offline until it is. If it is still unpaid
		after 30 days, we may cancel your subscription, and the "after you leave" section below applies.
		We don't charge late fees.
	</p>

	<h2 id="who-owns-what">{heading('who-owns-what')}</h2>
	<p>
		<strong>Your content is yours.</strong> Text, photos, logos, and anything else you give us stay yours.
		You give us permission to use, copy, and adapt them only to build, host, and run your site.
	</p>
	<p>
		<strong>Your domain is yours.</strong> If you don't already have a domain, we register one in your
		name. You can transfer it away from us at any time. We charge you for it at the registrar's price,
		unless your plan says the domain is included in your plan price. When your service ends, the domain
		moves to your own account with a domain registrar, and you pay its renewals from then on, even if
		it was included in your plan before. We email you the domain's renewal date and how to move it to
		your own account, and send a second reminder 30 days before it would lapse. If you don't take it over
		or don't renew it, we let it lapse.
	</p>
	<p>
		<strong>The site's design and code are ours, licensed to you.</strong> While you subscribe, you may
		use the site we built for you as your own. We keep ownership of the design and code, and of the tools,
		templates, and services we use across customers. Shared building blocks that are part of your site's
		front end (what runs in your visitors' browsers) come with your site files under the licence below.
		Anything we keep for ourselves runs on servers we operate and counts as one of our services.
	</p>
	<p>
		<strong>You can take your site with you.</strong> When your service ends, for any reason (you cancelled,
		it went unpaid, or we removed it under "Acceptable use"), you can ask for your website's files at
		any time within one year, and we give them to you free of charge, as they are. That means your site's
		own code and design, including the parts of it that connect to our other services. It does not include
		our services themselves, meaning anything that runs on servers we operate, such as a back-end, customer
		management system, or other system your site connects to. Those stop working for your site when you
		leave. We may hold back any material that is unlawful.
	</p>
	<p>
		You get a permanent licence to use, change, and host those files anywhere, and to have anyone
		else work on them for you.
	</p>
	<p>
		Some sites use fonts, images, or other assets that we licensed from someone else. If that
		licence doesn't allow us to pass them on, we remove them before handing over your files. If it
		does, we include them with a note that you may need your own licence to keep using them, and
		getting that licence is your responsibility.
	</p>
	<p>
		<strong>Showing our work.</strong> We only show your site in our portfolio if you say yes. You can
		withdraw that at any time and we will take it down.
	</p>

	<h2 id="after-you-leave">{heading('after-you-leave')}</h2>
	<p>
		When your service ends, whatever the reason (you cancelled, it went unpaid, or we removed it for
		breaking these terms):
	</p>
	<ul>
		<li>
			<strong>Your visitors' personal data</strong>, such as contact-form messages, is emailed to
			you as an export at your billing email address. We delete it from our systems 30 days later.
		</li>
		<li>
			<strong>Your site files and your own content</strong> are kept for up to one year, so you can come
			back and ask for them. After that we delete them. Deleting site files means removing them from the
			live site and our working files; copies of your site's code may remain in our access-restricted
			version history. Your visitors' personal data is never kept there, so its 30-day deletion is complete.
		</li>
		<li>
			<strong>Your domain:</strong> we email you how to move it to your own registrar account (see
			<a href="#who-owns-what">"Who owns what"</a>).
		</li>
	</ul>

	<h2 id="your-responsibilities">{heading('your-responsibilities')}</h2>
	<ul>
		<li>
			Only give us content you have the right to use. If someone claims your content infringes their
			rights, we may take it down while it is sorted out.
		</li>
		<li>
			You are responsible for what your site says and for following the laws that apply to your
			business, including any privacy notice for information your site collects from your visitors.
		</li>
		<li>Keep your contact and billing details current so we can reach you.</li>
	</ul>

	<h2 id="acceptable-use">{heading('acceptable-use')}</h2>
	<p>
		We won't host sites that are illegal, that infringe others' rights, that deceive people
		(phishing, scams, impersonation), that spread malware or spam, that harass or threaten anyone,
		or that put our systems or other customers at risk. If a site breaks these rules we may take it
		offline, and for serious or repeated problems, end the service. Where we reasonably can, we will
		tell you first and give you a chance to fix it.
	</p>

	<h2 id="availability-and-warranties">{heading('availability-and-warranties')}</h2>
	<p>
		We work hard to keep your site fast, secure, and online, but we can't promise it will never go
		down. We rely on hosting, domain, and payment providers that can have outages. Apart from what
		these terms say, the service is provided "as is", without other warranties, to the extent the
		law allows. Site files we hand over when you leave are also provided as is.
	</p>

	<h2 id="limits-on-liability">{heading('limits-on-liability')}</h2>
	<p>
		To the extent the law allows: we are not liable for indirect losses such as lost profits, lost
		revenue, or lost data. Our total liability for any claim relating to the service is limited to
		the greater of the amount you paid us in the 12 months before the claim, or $100. Nothing here
		limits liability that the law does not allow us to limit.
	</p>

	<h2 id="changes">{heading('changes')}</h2>
	<ul>
		<li>
			We may change your price with at least 30 days' notice by email. If you don't want the new
			price, you can cancel before it takes effect. We won't change your price in the middle of an
			annual period you have already paid for, except when you ask us to add something (see <a
				href="#adding-features">"Adding features"</a
			>).
		</li>
		<li>
			We may update these terms. For changes that matter, we will email you at least 30 days before
			they take effect. Continuing to use the service after that means you accept them.
		</li>
	</ul>

	<h2 id="free-sites-for-causes">{heading('free-sites-for-causes')}</h2>
	<p>
		We sometimes build and host sites for free for causes such as memorials, fundraisers, and
		community groups. A free site gets everything a paying customer gets, including small changes,
		your domain in your name, a year of keeping your files after the service ends, and your site
		files on request. These terms apply to free sites too; only the billing, refund, and late
		payment sections don't. We may end a free site with 30 days notice, and we will help you move.
	</p>

	<h2 id="custom-software">{heading('custom-software')}</h2>
	<p>
		Most of these terms are about website plans. If we build custom software for you outside a
		website plan, such as an app, an internal tool, an integration, or an automation, that software
		is yours once you have paid for it. "Who owns what" above covers websites on a plan and does not
		apply to it.
	</p>

	<h2 id="privacy">{heading('privacy')}</h2>
	<p>
		How we handle your personal information, and your billing data through Stripe, is described in
		our Privacy Policy at <a href={PAGES.privacy.path}>https://voidprojects.ai/privacy</a>. That
		includes how long we keep your site files and content after you leave.
	</p>

	<h2 id="legal-bits">{heading('legal-bits')}</h2>
	<ul>
		<li>
			These terms are governed by the laws of Tennessee, USA. Disputes go to the state or federal
			courts in Davidson County, Tennessee, though either of us may use small claims court.
		</li>
		<li>If any part of these terms can't be enforced, the rest still applies.</li>
		<li>
			These terms, plus your sign-up page or quote, are the whole agreement between us about the
			service.
		</li>
	</ul>

	<h2 id="contact">{heading('contact')}</h2>
	<address>
		Void Projects LLC<br />
		Mailing address: 501 Union St Ste 545 PMB 834400<br />
		Nashville, Tennessee 37219-1876, US<br />
		{@render mail()}
	</address>
</LegalPage>
