import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { ProjectResponse } from './interfaces/project-config.interface';
import { AuthService } from './auth.service';

@Injectable()
export class HttpService {
  private readonly logger = new Logger(HttpService.name);
  private readonly axiosInstance: AxiosInstance;

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {
    const baseURL = this.configService.get<string>('API_BASE_URL_USERS');
    
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for dynamic token injection and logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Get the current token from AuthService dynamically
        const token = this.authService.getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        //this.logger.debug(`Making request to: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        //this.logger.debug(`Response received: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        this.logger.error(`Response error: ${error.response?.status} - ${error.message}`);
        return Promise.reject(error);
      }
    );
  }

  async getProjectByGroupId(groupId: string): Promise<ProjectResponse> {
    try {
      const response = await this.axiosInstance.get<ProjectResponse>(
        `/groups/${groupId}/project`
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching project for group ${groupId}:`, error);
      throw error;
    }
  }
}

