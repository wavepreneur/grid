import Link from "next/link";
import { Building2, ExternalLink, FileText, Mail, Scale, Shield, User } from "lucide-react";
import { GridMarketingFooter } from "@/components/marketing/grid-marketing-footer";
import { GridNav } from "@/components/marketing/grid-nav";
import "@/app/grid-marketing.css";

export function GridImprintPage() {
  return (
    <div className="grid-marketing grid-marketing-studio min-h-screen">
      <GridNav />
      <main className="grid-imprint">
        <div className="grid-container">
          <header className="grid-imprint-hero">
            <span className="section-label">Legal</span>
            <h1 className="grid-h2">Imprint</h1>
            <p className="grid-body">Information according to § 5 TMG and legally required disclosures.</p>
          </header>

          <article className="grid-card grid-imprint-card">
            <h2>
              <Building2 size={20} strokeWidth={1.75} aria-hidden />
              Provider
            </h2>
            <p className="grid-imprint-brand">Tells</p>
            <p className="grid-product-copy">is a product of</p>
            <p className="grid-imprint-company">Kinetic Pillar OÜ</p>

            <div className="grid-imprint-grid">
              <section>
                <h3>
                  <Building2 size={16} strokeWidth={1.75} aria-hidden />
                  Registered office
                </h3>
                <p>
                  Tornimäe 5, 10145 Tallinn, Estonia
                  <small>Registered office</small>
                </p>
                <p>
                  <strong className="grid-imprint-sub">Berlin Hub / Project office</strong>
                  c/o Office Club
                  <br />
                  Pappelallee 78/79
                  <br />
                  10437 Berlin
                  <small>No postal acceptance · By appointment only</small>
                </p>
              </section>

              <section>
                <h3>
                  <User size={16} strokeWidth={1.75} aria-hidden />
                  Management board
                </h3>
                <p>Dervis Kilic</p>
              </section>

              <section>
                <h3>Company number</h3>
                <p>
                  17496198
                  <small>Estonian Commercial Register</small>
                </p>
              </section>

              <section>
                <h3>
                  <Mail size={16} strokeWidth={1.75} aria-hidden />
                  Contact
                </h3>
                <p>
                  <a href="mailto:dk@kineticpillar.co">dk@kineticpillar.co</a>
                  <small>
                    Or <Link href="/#access">request a session</Link> on this website.
                  </small>
                </p>
              </section>

              <section>
                <h3>VAT ID</h3>
                <p>EE102981852</p>
              </section>

              <section>
                <h3>Responsible for content</h3>
                <p>
                  according to § 18 para. 2 MStV:
                  <br />
                  Dervis Kilic
                  <br />
                  Tornimäe 5
                  <br />
                  10145 Tallinn, Estonia
                </p>
              </section>
            </div>
          </article>

          <article className="grid-card grid-imprint-card">
            <h2>
              <Scale size={20} strokeWidth={1.75} aria-hidden />
              Online dispute resolution
            </h2>
            <h3>Platform of the EU Commission for Online Dispute Resolution</h3>
            <p className="grid-product-copy">
              The European Commission provides a platform for online dispute resolution (ODR):
            </p>
            <p>
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer nofollow">
                https://ec.europa.eu/consumers/odr/
                <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
              </a>
            </p>
            <h3>Consumer dispute resolution</h3>
            <p className="grid-product-copy">
              We are not willing or obliged to participate in dispute resolution proceedings before a
              consumer arbitration board.
            </p>
          </article>

          <div className="grid-imprint-split">
            <article className="grid-card grid-imprint-card">
              <h2>
                <Shield size={20} strokeWidth={1.75} aria-hidden />
                Liability for content
              </h2>
              <p className="grid-product-copy">
                The contents of this website were created with the greatest care. We cannot guarantee
                the accuracy, completeness and timeliness of the content. As a service provider, we are
                responsible for our own content on these pages in accordance with § 7 para. 1 TMG under
                general law.
              </p>
              <p className="grid-product-copy">
                According to §§ 8 to 10 TMG, we as a service provider are not obliged to monitor
                transmitted or stored third-party information or to investigate circumstances that
                indicate illegal activity.
              </p>
              <p className="grid-product-copy">
                Obligations to remove or block the use of information under general law remain
                unaffected. Liability in this regard is only possible from the time of knowledge of a
                specific infringement. Upon becoming aware of such violations, we will remove this
                content immediately.
              </p>
            </article>

            <article className="grid-card grid-imprint-card">
              <h2>
                <ExternalLink size={20} strokeWidth={1.75} aria-hidden />
                Liability for links
              </h2>
              <p className="grid-product-copy">
                This website may contain links to external websites of third parties, on whose contents
                we have no influence. We cannot assume any liability for these external contents. The
                respective provider or operator of the websites is always responsible for the contents
                of the linked pages.
              </p>
              <p className="grid-product-copy">
                The linked pages were checked for possible legal violations at the time of linking.
                Illegal contents were not recognizable at the time of linking.
              </p>
              <p className="grid-product-copy">
                A permanent content-related control of the linked pages is not reasonable without
                concrete evidence of a legal violation. Upon becoming aware of legal violations, we
                will remove such links immediately.
              </p>
            </article>

            <article className="grid-card grid-imprint-card">
              <h2>
                <Shield size={20} strokeWidth={1.75} aria-hidden />
                Copyright
              </h2>
              <p className="grid-product-copy">
                The content and works created on this website are subject to German copyright law. The
                duplication, processing, distribution and any kind of exploitation outside the limits
                of copyright require written consent.
              </p>
              <p className="grid-product-copy">
                Downloads and copies of this page are only permitted for private, not commercial use.
              </p>
              <p className="grid-product-copy">
                Insofar as the content on this page was not created by us, the copyrights of third
                parties were observed. Third-party content was marked as such. Should you nevertheless
                become aware of a copyright infringement, please inform us. Upon becoming aware of
                legal violations, we will remove such content immediately.
              </p>
            </article>

            <article className="grid-card grid-imprint-card">
              <h2>
                <FileText size={20} strokeWidth={1.75} aria-hidden />
                Image credits
              </h2>
              <p className="grid-product-copy">Sources for images and graphics used:</p>
              <ul className="grid-imprint-list">
                <li>Own image material</li>
                <li>Licensed images from Canva.com</li>
              </ul>
            </article>
          </div>
        </div>
      </main>
      <GridMarketingFooter />
    </div>
  );
}
