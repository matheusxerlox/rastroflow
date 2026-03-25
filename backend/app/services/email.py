import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "RastroFlow <noreply@rastroflow.com.br>")
APP_URL = os.getenv("APP_URL", "https://v4.rastroflow.com.br")

def send_email(to: str, subject: str, html_content: str):
    if not resend.api_key:
        print(f"RESEND_API_KEY não configurada. Simulando envio de email para {to}: {subject}")
        return False
    
    try:
        params: resend.Emails.SendParams = {
            "from": EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html_content,
        }
        response = resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"Erro ao enviar email para {to}: {e}")
        return False

# Base template
def get_base_html(content: str) -> str:
    return f"""
    <div style="background-color: #111827; color: #f3f4f6; font-family: Arial, sans-serif; padding: 40px; border-radius: 8px;">
        <h2 style="color: #10b981;">RastroFlow</h2>
        {content}
        <hr style="border: 1px solid #374151; margin-top: 40px;" />
        <p style="color: #9ca3af; font-size: 12px;">Esta é uma mensagem automática. Por favor, não responda.</p>
    </div>
    """

def send_welcome_email(to: str, name: str, temp_password: str):
    content = f"""
    <p>Olá, {name}!</p>
    <p>Seu acesso ao RastroFlow foi criado com sucesso.</p>
    <p><b>Seu E-mail:</b> {to}</p>
    <p><b>Sua Senha Temporária:</b> {temp_password}</p>
    <p><a href="{APP_URL}/login" style="color: #10b981;">Clique aqui para acessar</a></p>
    <p>Recomendamos que você altere sua senha no primeiro acesso nas Configurações.</p>
    """
    return send_email(to, "Seu acesso ao RastroFlow foi criado!", get_base_html(content))

def send_subscription_renewed_email(to: str, name: str, expira_em: str):
    content = f"""
    <p>Olá, {name}!</p>
    <p>Sua assinatura RastroFlow foi renovada com sucesso!</p>
    <p>Sua nova data de expiração é: <b>{expira_em}</b>.</p>
    """
    return send_email(to, "Sua assinatura RastroFlow foi renovada!", get_base_html(content))

def send_subscription_expired_email(to: str, name: str):
    content = f"""
    <p>Olá, {name}.</p>
    <p>Sua assinatura RastroFlow expirou.</p>
    <p>Para continuar utilizando nossos serviços de rastreamento, por favor renove seu plano através do nosso gateway de pagamento Cakto.</p>
    """
    return send_email(to, "Sua assinatura RastroFlow expirou", get_base_html(content))

def send_subscription_canceled_email(to: str, name: str):
    content = f"""
    <p>Olá, {name}.</p>
    <p>Sua assinatura no RastroFlow foi cancelada e o seu acesso foi imediatamente encerrado.</p>
    <p>Caso deseje voltar a utilizar a ferramenta no futuro, basta realizar uma nova assinatura.</p>
    """
    return send_email(to, "Sua assinatura RastroFlow foi cancelada", get_base_html(content))

def send_subscription_refunded_email(to: str, name: str):
    content = f"""
    <p>Olá, {name}.</p>
    <p>Seu acesso ao RastroFlow foi removido devido a um reembolso aprovado.</p>
    """
    return send_email(to, "Seu acesso RastroFlow foi removido", get_base_html(content))

def send_password_reset_email(to: str, token: str):
    content = f"""
    <p>Você solicitou uma alteração de senha.</p>
    <p><a href="{APP_URL}/reset-password?token={token}" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px;">Redefinir Senha</a></p>
    <p>Se você não solicitou, ignore este email. Este link é válido por 30 minutos.</p>
    """
    return send_email(to, "Redefinição de senha RastroFlow", get_base_html(content))



def send_quota_exhausted_email(to: str, name: str):
    content = f"""
    <p>Olá, {name}!</p>
    <p>Você atingiu seu limite de rastreios disponíveis para este mês.</p>
    <p>Novas encomendas não estão sendo registradas no 17TRACK. Por favor, compre mais quota na aba Configurações (ou via Keedpay/Cakto) e depois reenvie as encomendas pendentes através do painel da Keedpay.</p>
    """
    return send_email(to, "⚠️ Você atingiu seu limite de rastreios", get_base_html(content))
