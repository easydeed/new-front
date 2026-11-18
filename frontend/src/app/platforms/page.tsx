import { redirect } from 'next/navigation'

/** The platforms page is the homepage. This address exists so a link
 *  to /platforms lands on the same page. */
export default function PlatformsAlias() {
  redirect('/')
}
