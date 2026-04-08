import { getContacts } from './actions';
import ContactsClient from './ContactsClient';

export default async function ContactsPage() {
    const messages = await getContacts();
    return <ContactsClient initialMessages={messages} />;
}
