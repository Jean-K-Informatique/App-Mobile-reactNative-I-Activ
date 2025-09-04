import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

interface LegalPageModalProps {
  visible: boolean;
  onClose: () => void;
  pageType: 'privacy' | 'terms' | 'legal' | 'cookies' | null;
}

const legalContent = {
  privacy: {
    title: 'Politique de confidentialité',
    content: `I-ACTIV – https://app-i-activ.fr

ARTICLE 1 - PRÉAMBULE
Il est ici rappelé que le site internet https://app-i-activ.fr propose à ses utilisateurs la mise à disposition d'espaces de conversation intelligents, ayant pour finalité de les assister dans des taches spécifiques à but exclusivement professionnel.

La présente politique de confidentialité a pour but d'informer les utilisateurs du site :

Sur la manière dont sont collectées leurs données personnelles. Sont considérées comme des données personnelles, toute information permettant d'identifier un utilisateur. A ce titre, il peut s'agir : de ses noms et prénoms, de son âge, de son adresse postale ou email, de sa localisation ou encore de son adresse IP (liste non-exhaustive) ;
Sur les droits dont ils disposent concernant ces données ;
Sur la personne responsable du traitement des données à caractère personnel collectées et traitées ;
Sur les destinataires de ces données personnelles ;
Sur la politique du site en matière de cookies.
Cette politique complète les mentions légales, les conditions générales d'utilisation (CGU) et la politique en matière de cookies, consultables par les utilisateurs.

ARTICLE 2 - PRINCIPES RELATIFS À LA COLLECTE ET AU TRAITEMENT DES DONNÉES PERSONNELLES
Conformément à l'article 5 du Règlement européen 2016/679, les données à caractère personnel sont :

Traitées de manière licite, loyale et transparente au regard de la personne concernée ;
Collectées pour des finalités déterminées (cf. Article 3.1 des présentes), explicites et légitimes, et ne pas être traitées ultérieurement d'une manière incompatible avec ces finalités ;
Adéquates, pertinentes et limitées à ce qui est nécessaire au regard des finalités pour lesquelles elles sont traitées ;
Exactes et, si nécessaire, tenues à jour. Toutes les mesures raisonnables doivent être prises pour que les données à caractère personnel qui sont inexactes, eu égard aux finalités pour lesquelles elles sont traitées, soient effacées ou rectifiées sans tarder ;
Conservées sous une forme permettant l'identification des personnes concernées pendant une durée n'excédant pas celle nécessaire au regard des finalités pour lesquelles elles sont traitées ;
Traitées de façon à garantir une sécurité appropriée des données collectées, y compris la protection contre le traitement non autorisé ou illicite et contre la perte, la destruction ou les dégâts d'origine accidentelle, à l'aide de mesures techniques ou organisationnelles appropriées.
Le traitement n'est licite que si, et dans la mesure où, au moins une des conditions suivantes est remplie :

La personne concernée a consenti au traitement de ses données à caractère personnel pour une ou plusieurs finalités spécifiques ;
Le traitement est nécessaire à l'exécution d'un contrat auquel la personne concernée est partie ou à l'exécution de mesures précontractuelles prises à la demande de celle-ci ;
Le traitement est nécessaire au respect d'une obligation légale à laquelle le responsable du traitement est soumis ;
Le traitement est nécessaire à la sauvegarde des intérêts vitaux de la personne concernée ou d'une autre personne physique ;
Le traitement est nécessaire à l'exécution d'une mission d'intérêt public ou relevant de l'exercice de l'autorité publique dont est investi le responsable du traitement ;
Le traitement est nécessaire aux fins des intérêts légitimes poursuivis par le responsable du traitement ou par un tiers, à moins que ne prévalent les intérêts ou les libertés et droits fondamentaux de la personne concernée qui exigent une protection des données à caractère personnel, notamment lorsque la personne concernée est un enfant.

ARTICLE 3 - DONNÉES À CARACTÈRE PERSONNEL COLLECTÉES ET TRAITÉES DANS LE CADRE DE LA NAVIGATION SUR LE SITE

ARTICLE 3.1 - Données collectées
Les utilisateurs du site internet https://app-i-activ.fr sont informés que les données suivantes sont collectées, aux seules fins d'assurer leur connexion aux services et d'amélioration continue desdits services (statistiques, expérience utilisateur, gestion des bugs etc.) : prénom, nom, adresse e-mail, localisation.

L'ensemble des conversations échangées à l'occasion de l'usage du site sont stockées exclusivement de manière locale sous forme de Cookies sur le navigateur web de l'utilisateur (cf. politique en matière de cookies)

Hormis les données susmentionnées, aucune donnée personnelle relative à l'utilisateur n'est ainsi collectée par I-ACTIV.

ARTICLE 3.2 - Mode de collecte des données
Les données collectées sont conservées par le responsable du traitement dans des conditions raisonnables de sécurité, pour une durée qui n'excède pas ce qui est nécessaire à leur finalité.

Il est ici rappelé qu'à tout moment, l'utilisateur peut demander à exercer ses droits, par mail à contact@i-activ.fr (cf. article 5 infra).

ARTICLE 3.3 - Hébergement des données
Le site https://app-i-activ.fr est hébergé par :

I-Activ
Société par actions simplifiée
Au capital social de 1 000 euros
120 rue Febvottes à TOURS (37000)
contact@i-activ.fr

ARTICLE 3.4 - Transmission des données à des tiers
Il est ici précisé qu'I-ACTIV ne transmet aucune donnée à des tiers à des fins commerciales.

Dans le cadre de l'utilisation des services, I-ACTIV fait appel à Google FireBase pour la gestion des accès utilisateurs.

ARTICLE 3.5 - Politique en matière de cookies
Notre politique en matière de cookies est consultable à l'adresse suivante : Politique de cookies

ARTICLE 4 - RESPONSABLE DU TRAITEMENT DES DONNÉES
Les données à caractère personnelles sont collectées par I-ACTIV, société par actions simplifiée au capital de 1 000 euros, dont le siège social est 120 rue Febvotte à TOURS (37000) et immatriculée au Registre national des entreprises sous le numéro 940 240 492.

Le responsable du traitement des données à caractère personnel peut être contacté de la manière suivante :
Par mail : contact@i-activ.fr

Si vous estimez, après nous avoir contactés, que vos droits "Informatique et Libertés", ne sont pas respectés, vous pouvez adresser une information à la CNIL.

ARTICLE 5 - LES DROITS DE L'UTILISATEUR EN MATIÈRE DE COLLECTE ET DE TRAITEMENT DES DONNÉES
Tout utilisateur concerné par le traitement de ses données personnelles peut se prévaloir des droits suivants, en application du règlement européen 2016/679 et de la Loi Informatique et Liberté (Loi 78-17 du 6 janvier 1978) :

Droit d'accès, de rectification et droit à l'effacement des données (posés respectivement aux articles 15, 16 et 17 du RGPD) ;
Droit à la portabilité des données (article 20 du RGPD) ;
Droit à la limitation (article 18 du RGPD) et à l'opposition du traitement des données (article 21 du RGPD) ;
Droit de ne pas faire l'objet d'une décision fondée exclusivement sur un procédé automatisé ;
Droit de déterminer le sort des données après la mort ;
Droit de saisir l'autorité de contrôle compétente (article 77 du RGPD).
Pour exercer vos droits, veuillez adresser votre demande par mail à contact@i-activ.fr

Afin que le responsable du traitement des données puisse faire droit à sa demande, l'utilisateur peut être tenu de lui communiquer certaines informations telles que : ses noms et prénoms, son adresse e-mail ainsi que son numéro de compte, d'espace personnel ou d'abonné.

Consultez le site cnil.fr pour plus d'informations sur vos droits.

ARTICLE 6 - CONDITIONS DE MODIFICATION DE LA POLITIQUE DE CONFIDENTIALITÉ
L'éditeur du site se réserve le droit de pouvoir modifier la présente Politique à tout moment afin d'assurer aux utilisateurs du site sa conformité avec le droit en vigueur.

Les éventuelles modifications ne sauraient avoir d'incidence sur les interactions antérieurement effectuées sur le site, lesquels restent soumis à la Politique en vigueur au moment de sa visite et telle qu'acceptée par l'utilisateur lors de sa connexion.

L'utilisateur est invité à prendre connaissance de cette Politique à chaque fois qu'il utilise nos services, sans qu'il soit nécessaire de l'en prévenir formellement.`
  },
  terms: {
    title: 'Conditions générales d\'utilisation',
    content: `I-ACTIV – https://app-i-activ.fr

ARTICLE 1 - PRESENTATION DU SITE
Le site https://app-i-activ.fr (ci-après « le site ») est édité par I-ACTIV, société par actions simplifiée au capital de 1 000 euros dont le siège social est situé 120 rue Febvotte à TOURS (37000), immatriculée au Registre national des entreprises sous le numéro 940 240 492

Adresse e-mail de contact : contact@i-activ.fr

Le site propose aux utilisateurs, selon leur abonnement, des services basés sur une intelligence artificielle (IA) conçue pour répondre à des besoins professionnels spécifiques.

L'accès et l'utilisation du site sont soumis aux présentes conditions générales d'utilisation (CGU). En naviguant sur le site ou en utilisant les services, l'utilisateur accepte sans réserve les CGU.

ARTICLE 2 - DEFINITIONS
Utilisateur : toute personne naviguant, visitant ou utilisant les services proposés sur le site, avec ou sans abonnement.
Éditeur : la personne morale ou physique responsable de l'administration du site.
Services : les fonctionnalités proposées sur le site, notamment l'accès au chat d'IA.

ARTICLE 3 - ACCES AU SITE ET AUX SERVICES
3.1- Accès général

L'accès aux fonctionnalités, notamment le chat d'IA, est conditionné à la souscription d'un abonnement.

3.2- Modalités d'abonnement

L'utilisateur souhaitant accéder aux services complets doit souscrire à un abonnement en prenant contact à l'adresse mail suivante : contact@i-activ.fr

3.3- Interruption et modification des services

L'éditeur se réserve le droit de modifier, suspendre ou interrompre tout ou partie des services proposés, notamment en cas de maintenance, sans que cela n'ouvre droit à une quelconque indemnité.

ARTICLE 4 - USAGE DU CHAT D'IA : REGLES SPECIFIQUES
4.1- Nature des informations transmises

L'utilisateur s'engage à ne pas transmettre d'informations :

Confidentielles ou sensibles relatives à sa personne ou à des tiers ;
Inappropriées, illicites ou contraires à l'ordre public ;
Offensantes, discriminatoires ou portant atteinte aux droits d'autrui.

4.2- Usage professionnel uniquement

Le site et le chat d'IA sont strictement réservés à un usage professionnel, conformément à la finalité du site. Toute utilisation détournée, notamment à des fins personnelles ou illicites, est interdite.

4.3- Absence de stockage de données

Le contenu des données conversationnelles et documentaires transmises dans le chat d'IA n'est pas stocké par l'éditeur. Seul le nombre de requêtes et de caractères saisis est connu de l'éditeur.

Les informations de connexion sont par ailleurs stockées par l'éditeur au moyen de Google FireBase aux seules fins de fonctionnement du site, ainsi que de mesure et d'analyse.

Toutefois, l'utilisateur doit rester vigilant quant aux informations qu'il partage et est seul responsable des contenus qu'il saisit.

ARTICLE 5 - PROPRIETE INTELLECTUELLE
Tous les éléments du site (textes, images, graphismes, algorithmes, etc.) sont protégés par les lois en vigueur sur la propriété intellectuelle (articles L111-1 et suivants du Code de la propriété intellectuelle).

Toute reproduction, représentation, modification ou adaptation, totale ou partielle, sans autorisation préalable écrite de l'éditeur, est strictement interdite et constitue une contrefaçon (articles L335-2 et suivants du Code de la propriété intellectuelle).

ARTICLE 6 - RESPONSABILITE DE L'EDITEUR
L'éditeur s'efforce de fournir des informations fiables et des réponses précises via le chat d'IA. Toutefois :

Les réponses fournies par l'IA sont générées automatiquement et doivent être utilisées sous la responsabilité exclusive de l'utilisateur.
L'éditeur ne garantit pas l'exactitude ou l'exhaustivité des réponses, qui ne constituent pas des conseils juridiques, financiers ou professionnels.
L'éditeur ne pourra être tenu responsable de :

Toute erreur ou omission dans les informations fournies ;
Tout dommage direct ou indirect résultant de l'utilisation des réponses du chat d'IA ;
La perte de données ou de contenu lié à l'utilisation des services.

ARTICLE 7 - OBLIGATIONS DE L'UTILISATEUR
L'utilisateur s'engage à :

Utiliser le site conformément aux lois et règlements en vigueur ;
Respecter les droits de propriété intellectuelle de l'éditeur et des tiers ;
Ne pas détourner les fonctionnalités du site à des fins illicites, personnelles ou contraires à sa finalité professionnelle.

ARTICLE 8 - PROTECTION DES DONNEES PERSONNELLES
Les données personnelles des utilisateurs sont traitées conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.

Pour plus d'informations, consultez notre politique de confidentialité et notre politique en matière de cookies.

ARTICLE 9 - LIENS HYPERTEXTES
Le site peut contenir des liens vers des sites tiers. L'éditeur décline toute responsabilité concernant le contenu, les pratiques ou la disponibilité de ces sites.

ARTICLE 10 - DROIT APPLICABLE ET JURIDICTION COMPETENTE
Les présentes CGU sont régies par le droit français. Tout litige relatif à leur interprétation ou exécution sera soumis à la compétence exclusive des tribunaux français.

ARTICLE 11 - MODIFICATION DES CGU
L'éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les nouvelles versions seront publiées sur le site et entreront en vigueur immédiatement.`
  },
  legal: {
    title: 'Mentions légales',
    content: `I-ACTIV – https://app-i-activ.fr

ARTICLE 1 - Éditeur du site
Le présent site web https://app-i-activ.fr est édité par :

Dénomination sociale : I-ACTIV
Forme juridique : SAS
Capital social : 1 000 euros
Siège social : 120 rue Febvotte – 37000 TOURS
Numéro d'immatriculation : RCS TOURS 940 240 492
Directeur de la publication : Monsieur Jean-Christophe CARIOU
E-mail : contact@i-activ.fr

ARTICLE 2 - Hébergeur du site
Le site est hébergé par :

I-ACTIV
Société par actions simplifiée
Au capital social de 1 000 euros
120 rue Febvotte à TOURS (37000)
contact@i-activ.fr

ARTICLE 3 - Activité de la plateforme
La plateforme I-ACTIV propose les services suivants : mise à disposition d'espaces de conversation intelligents, ayant pour finalité d'assister l'utilisateur dans des taches spécifiques à but exclusivement professionnel.

ARTICLE 4 - Propriété intellectuelle
L'ensemble du contenu présent sur ce site (textes, images, graphismes, logos, vidéos, etc.) est protégé par le droit d'auteur et la propriété intellectuelle. Toute reproduction, modification ou diffusion sans autorisation écrite préalable est interdite.

ARTICLE 5 - Données personnelles et confidentialité
Conformément au RGPD et à la Loi Informatique et Libertés, les utilisateurs disposent d'un droit d'accès, de rectification et de suppression de leurs données personnelles.

Responsable du traitement des données : I-ACTIV

Finalité du traitement : Les utilisateurs du site internet https://app-i-activ.fr sont informés que les données suivantes sont collectées, aux seules fins d'assurer leur connexion aux services et d'amélioration continue desdits services (statistiques, expérience utilisateur, gestion des bugs etc.) : prénom, nom, adresse e-mail, localisation.

Droit d'accès et de rectification : Vous pouvez exercer vos droits en nous contactant à l'adresse suivante : contact@i-activ.fr

Politique de confidentialité : Lien vers la politique de confidentialité complète

ARTICLE 6 - Cookies
Lors de votre navigation, des cookies peuvent être déposés sur votre terminal afin d'améliorer votre expérience utilisateur.

Pour en savoir plus, consultez notre Politique de cookies.

ARTICLE 7 - Responsabilité
L'éditeur du site ne saurait être tenu responsable des dommages directs ou indirects résultant de l'utilisation du site, de l'interruption du service ou de l'inexactitude des informations publiées.

ARTICLE 8 - Droit applicable et litiges
Les présentes mentions légales sont soumises au droit français. Tout litige sera soumis aux tribunaux compétents du siège social de la société I-ACTIV.`
  },
  cookies: {
    title: 'Politique en matière de cookies',
    content: `La présente politique en matière de cookies explique comment I-ACTIV utilise des cookies et des technologies similaires sur le site web https://app-i-activ.fr

En visitant notre site, vous acceptez l'utilisation de cookies conformément aux termes de cette politique, sauf si vous désactivez les cookies comme indiqué ci-dessous.

ARTICLE 2 - QU'EST-CE QU'UN COOKIE ?
Un cookie est un petit fichier texte stocké sur votre appareil (ordinateur, tablette, smartphone) lorsque vous visitez un site web. Les cookies permettent au site de reconnaître votre appareil et de mémoriser certaines informations vous concernant, comme vos préférences ou vos données de connexion.

ARTICLE 3 - TYPES DE COOKIES UTILISES
Nous utilisons plusieurs types de cookies :

Cookies strictement nécessaires : Ces cookies sont essentiels pour le fonctionnement de notre site et ne peuvent pas être désactivés dans nos systèmes. Par exemple, ils permettent de maintenir votre session active.
Cookies fonctionnels : Ces cookies permettent d'améliorer les fonctionnalités et la personnalisation de notre site.
Cookies de performance : Ces cookies collectent des informations anonymes sur la manière dont les visiteurs utilisent notre site, ce qui nous aide à améliorer nos services.

ARTICLE 4 - LISTE DES COOKIES UTILISES
Nous utilisons les cookies suivants sur notre site :

Nom du cookie	Type de cookie	Finalité	Durée de conservation
Cache documents	Strictement nécessaire	Cache	10 minutes
Cache chats	Strictement nécessaire	Cache	5 minutes
Historique des chats	Fonctionnel	Historique	Nettoyage manuel par l'utilisateur

ARTICLE 5 - CONSENTEMENT A L'UTILISATION DES COOKIES
Lors de votre première visite sur notre site, un bandeau d'information s'affiche pour vous informer de l'utilisation des cookies. Vous devez alors accepter l'ensemble des cookies pour permettre une utilisation optimale du site.

ARTICLE 6 - GESTION DES COOKIES
Vous pouvez à tout moment supprimer les cookies via les paramètres du navigateur.

La plupart des navigateurs permettent de bloquer ou de supprimer les cookies.

En revanche, le blocage ou la suppression des cookies pourrait ne plus vous permettre d'utiliser correctement les fonctionnalités du site.

ARTICLE 7 - VOS DROITS
Conformément au Règlement général sur la protection des données (RGPD) et à la Loi Informatique et Libertés, vous avez le droit de :

Accéder à vos données personnelles collectées via les cookies ;
Demander leur rectification ou suppression ;
Retirer votre consentement à tout moment.
Pour exercer vos droits, vous pouvez nous contacter à :

Email : contact@i-activ.fr

Adresse postale : I-ACTIV - 120 rue Febvotte – 37000 TOURS

ARTICLE 8 - MODIFICATIONS DE LA POLITIQUE DE COOKIES
Nous nous réservons le droit de modifier cette politique à tout moment. Les changements seront publiés sur cette page avec une date de mise à jour.

ARTICLE 9 - CONTACT
Pour toute question concernant cette politique ou notre utilisation des cookies, contactez-nous à : contact@i-activ.fr`
  }
};

export default function LegalPageModal({ visible, onClose, pageType }: LegalPageModalProps) {
  const { theme, isDark } = useTheme();

  if (!pageType || !visible) return null;

  const content = legalContent[pageType];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#2a2a2a' : '#e5e7eb' }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.backButtonText, { color: '#007AFF' }]}>‹ Retour</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]} numberOfLines={1}>
            {content.title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.text, { color: theme.text.secondary }]}>
            {content.content}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  headerSpacer: {
    width: 50, // Pour équilibrer avec le bouton retour
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'monospace', // Pour un rendu plus lisible des textes légaux
  },
});
