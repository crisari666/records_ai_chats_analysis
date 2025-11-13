import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';

interface LoginResponse {
  access_token?: string;
  token?: string;
  [key: string]: any;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly axiosInstance: AxiosInstance;
  private currentToken: string | null = null;

  constructor(private configService: ConfigService) {
    const baseURL = this.configService.get<string>('API_BASE_URL_USERS');
    
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async onModuleInit() {
    this.logger.log('Initializing authentication...');
    await this.login();
  }

  /**
   * Login to the API and store the token
   */
  async login(): Promise<void> {
    try {
      const identifier = this.configService.get<string>('API_MS_USERS_AUTH_USER');
      const password = this.configService.get<string>('API_MS_USERS_AUTH_PASS');
      const baseURL = this.configService.get<string>('API_BASE_URL_USERS');

      if (!identifier || !password) {
        this.logger.error('Missing authentication credentials. Please set API_MS_USERS_AUTH_USER and API_MS_USERS_AUTH_PASS in .env file');
        return;
      }

      if (!baseURL) {
        this.logger.error('Missing API_BASE_URL_USERS in .env file');
        return;
      }

      this.logger.log('Attempting to login...');
      
      const response = await axios.post<LoginResponse>(
        `${baseURL}auth/login`,
        {
          identifier,
          password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      

      // Extract token from response (handle different possible response formats)
      const token = response.data?.access_token || response.data?.token || response.data?.data?.access_token || response.data?.data?.token;
      
      if (token) {
        this.currentToken = token;
        this.logger.log('Authentication successful. Token stored.');
      } else {
        this.logger.warn('Login successful but no token found in response:', JSON.stringify(response.data));
      }
    } catch (error) {
      this.logger.error('Authentication failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Refresh token daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshToken(): Promise<void> {
    this.logger.log('Refreshing authentication token...');
    await this.login();
  }

  /**
   * Get the current authentication token
   */
  getToken(): string | null {
    return this.currentToken;
  }

  /**
   * Check if authentication token is available
   */
  isAuthenticated(): boolean {
    return this.currentToken !== null;
  }
}

